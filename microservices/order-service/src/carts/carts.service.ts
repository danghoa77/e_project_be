import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart } from '../schemas/cart.schema';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { RedisService } from '@app/common-auth'; 

@Injectable()
export class CartsService {
    constructor(
        @InjectModel(Cart.name) private cartModel: Model<Cart>,
        private httpService: HttpService, 
        private redisService: RedisService, // dùng Redis để cache giỏ hàng
    ) { }

    // Lấy giỏ hàng theo userId, ưu tiên lấy từ Redis
    async getCartByUserId(userId: Types.ObjectId): Promise<Cart> {
        const cachedCart = await this.redisService.get(`cart:${userId.toHexString()}`);
        if (cachedCart) {
            console.log('Cart from Redis cache');
            return JSON.parse(cachedCart);
        }

        let cart = await this.cartModel.findOne({ userId }).exec();
        if (!cart) {
            cart = new this.cartModel({ userId, items: [] });
            await cart.save();
        }

        await this.redisService.set(`cart:${userId.toHexString()}`, JSON.stringify(cart), 60 * 60);
        return cart;
    }

    // Thêm sản phẩm vào giỏ hàng
    async addItemToCart(userId: Types.ObjectId, addItemDto: AddToCartDto): Promise<Cart> {
        const { productId, variantId, quantity } = addItemDto;

        // Kiểm tra tồn kho từ Product Service
        const productUrl = `http://product-service:3000/products/${productId}`;
        let productData: any;
        try {
            const response = await firstValueFrom(this.httpService.get(productUrl));
            productData = response.data;
        } catch (error) {
            throw new NotFoundException('Product does not exist or Product Service is unavailable.');
        }

        const variant = productData.variants.find(v => v._id === variantId);
        if (!variant) {
            throw new BadRequestException('Product variant does not exist.');
        }

        if (variant.stock < quantity) {
            throw new BadRequestException(`Insufficient stock for ${productData.name} (${variant.size} - ${variant.color}). Only ${variant.stock} left.`);
        }

        // Cập nhật giỏ hàng
        const cart = await this.getCartByUserId(userId);
        const existingItemIndex = cart.items.findIndex(
            item => item.productId.equals(productId) && item.variantId === variantId,
        );

        if (existingItemIndex > -1) {
            // Nếu sản phẩm đã có trong giỏ thì tăng số lượng
            const newQuantity = cart.items[existingItemIndex].quantity + quantity;
            if (newQuantity > variant.stock) {
                throw new BadRequestException(`Cannot add. Total quantity exceeds stock: ${variant.stock}.`);
            }
            cart.items[existingItemIndex].quantity = newQuantity;
        } else {
            // Thêm sản phẩm mới vào giỏ
            cart.items.push({
                productId: new Types.ObjectId(productId),
                variantId,
                quantity,
            });
        }

        await cart.save();
        await this.redisService.del(`cart:${userId.toHexString()}`); // Xóa cache giỏ hàng
        return cart;
    }

    // Xóa một item khỏi giỏ hàng
    async removeItemFromCart(userId: Types.ObjectId, productId: string, variantId: string): Promise<Cart> {
        const cart = await this.getCartByUserId(userId);

        cart.items = cart.items.filter(
            item => !(item.productId.equals(productId) && item.variantId === variantId),
        );

        await cart.save();
        await this.redisService.del(`cart:${userId.toHexString()}`);
        return cart;
    }

    // Cập nhật số lượng item trong giỏ hàng
    async updateItemQuantity(userId: Types.ObjectId, productId: string, variantId: string, quantity: number): Promise<Cart> {
        if (quantity <= 0) {
            // Nếu số lượng <= 0 thì xóa khỏi giỏ
            return this.removeItemFromCart(userId, productId, variantId);
        }

        const cart = await this.getCartByUserId(userId);
        const existingItem = cart.items.find(
            item => item.productId.equals(productId) && item.variantId === variantId,
        );

        if (!existingItem) {
            throw new NotFoundException('Item not found in cart.');
        }

        // Kiểm tra tồn kho
        const productUrl = `http://product-service:3000/products/${productId}`;
        let productData: any;
        try {
            const response = await firstValueFrom(this.httpService.get(productUrl));
            productData = response.data;
        } catch (error) {
            throw new NotFoundException('Product does not exist or Product Service is unavailable.');
        }

        const variant = productData.variants.find(v => v._id === variantId);
        if (!variant) {
            throw new BadRequestException('Product variant does not exist.');
        }
        if (variant.stock < quantity) {
            throw new BadRequestException(`Insufficient stock. Only ${variant.stock} left.`);
        }

        existingItem.quantity = quantity;
        await cart.save();
        await this.redisService.del(`cart:${userId.toHexString()}`);
        return cart;
    }

    // Xóa toàn bộ giỏ hàng
    async clearCart(userId: Types.ObjectId): Promise<void> {
        const cart = await this.getCartByUserId(userId);
        cart.items = [];
        await cart.save();
        await this.redisService.del(`cart:${userId.toHexString()}`);
    }
}
