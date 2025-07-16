import {
    Injectable,
    BadRequestException,
    NotFoundException,
    Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { Cart, CartDocument } from '../schemas/cart.schema';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { RedisService } from '@app/common-auth';

interface ProductVariant {
    _id: string;
    stock: number;
    price: number;
    salePrice: number;
    name: string;
    size: string;
    color: string;

}

interface ProductData {
    variants: ProductVariant[];
    name: string;
}

@Injectable()
export class CartsService {
    private readonly logger = new Logger(CartsService.name);

    constructor(
        @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
        private readonly httpService: HttpService,
        private readonly redisService: RedisService,
    ) { }

    //get cart from db or create a new one if not exists
    private async _getFreshCartByUserId(userId: string): Promise<CartDocument> {
        let cart = await this.cartModel
            .findOne({ userId: new Types.ObjectId(userId) })
            .exec();
        if (!cart) {
            this.logger.log(`No cart found for user ${userId}. Creating a new one.`);
            cart = new this.cartModel({
                userId: new Types.ObjectId(userId),
                items: [],
            });
        }
        return cart;
    }

    // get variant from product service
    private async _getProductVariant(
        productId: string,
        variantId: string,
    ): Promise<ProductVariant> {
        const productUrl = `http://product-service:3000/products/${productId}`;
        try {
            const response = await firstValueFrom(
                this.httpService.get<ProductData>(productUrl),
            );
            const productData = response.data;

            if (!productData || !productData.variants) {
                throw new NotFoundException(
                    `Product data is invalid for ID ${productId}.`,
                );
            }

            const variant = productData.variants.find(
                (v) => v._id.toString() === variantId,
            );
            if (!variant) {
                throw new BadRequestException(
                    `Product variant with ID ${variantId} does not exist.`,
                );
            }
            return variant;
        } catch (error) {
            this.logger.error(
                `Failed to get product ${productId} from Product Service`,
                error instanceof Error ? error.stack : error,
            );
            throw new NotFoundException(
                `Product with ID ${productId} does not exist or Product Service is unavailable.`,
            );
        }
    }

    async getCartByUserId(userId: string): Promise<Cart> {
        const cacheKey = `cart:${userId}`;
        const cachedCart = await this.redisService.get(cacheKey);

        if (cachedCart) {
            this.logger.log(`Cart for user ${userId} found in Redis cache.`);
            return JSON.parse(cachedCart) as Cart;
        }

        this.logger.log(`Cart for user ${userId} not in cache. Finding in DB...`);
        const cart = await this._getFreshCartByUserId(userId);
        await cart.save();

        this.logger.log(`Caching cart for user ${userId}.`);
        await this.redisService.set(
            cacheKey,
            JSON.stringify(cart.toObject()),
            3600,
        );
        return cart.toObject();
    }

    async addItemToCart(
        userId: string,
        addItemDto: AddToCartDto,
    ): Promise<CartDocument> {
        const { productId, variantId, quantity } = addItemDto;

        const variant = await this._getProductVariant(productId, variantId);

        if (variant.stock < quantity) {
            throw new BadRequestException(
                `Insufficient stock for variant ${variantId}. Only ${variant.stock} left.`,
            );
        }

        const cart = await this._getFreshCartByUserId(userId);
        const existingItemIndex = cart.items.findIndex(
            (item) =>
                item.productId.toString() === productId && item.variantId === variantId,
        );

        if (existingItemIndex > -1) {
            const newQuantity = cart.items[existingItemIndex].quantity + quantity;
            if (newQuantity > variant.stock) {
                throw new BadRequestException(
                    `Cannot add. Total quantity in cart (${newQuantity}) exceeds stock (${variant.stock}).`,
                );
            }
            cart.items[existingItemIndex].quantity = newQuantity;
        } else {
            cart.items.push({
                productId: new Types.ObjectId(productId),
                variantId,
                quantity,
                price: variant.price,
            });
        }

        await this.redisService.del(`cart:${userId}`);
        return cart.save();
    }

    async removeItemFromCart(
        userId: string,
        productId: string,
        variantId: string,
    ): Promise<CartDocument> {
        const cart = await this._getFreshCartByUserId(userId);

        const itemExists = cart.items.some(
            (item) =>
                item.productId.toString() === productId && item.variantId === variantId,
        );

        if (!itemExists) {
            throw new Error(
                `Không tìm thấy sản phẩm với productId ${productId} và variantId ${variantId} trong giỏ hàng`,
            );
        }

        const updatedCart = await this.cartModel.findOneAndUpdate(
            { userId },
            {
                $pull: {
                    items: {
                        productId,
                        variantId,
                    },
                },
            },
            { new: true } // Trả lại document mới
        );

        await this.redisService.del(`cart:${userId}`);
        this.logger.log(
            `Item with productId ${productId} and variantId ${variantId} removed from cart for user ${userId}.`,
        );

        return updatedCart;
    }

    async updateItemQuantity(
        userId: string,
        productId: string,
        variantId: string,
        quantity: number,
    ): Promise<CartDocument> {
        if (quantity <= 0) {
            return this.removeItemFromCart(userId, productId, variantId);
        }

        const cart = await this._getFreshCartByUserId(userId);
        const itemIndex = cart.items.findIndex(
            (item) =>
                item.productId.toString() === productId && item.variantId === variantId,
        );

        if (itemIndex === -1) {
            throw new NotFoundException('Item not found in cart.');
        }

        const variant = await this._getProductVariant(productId, variantId);
        if (variant.stock < quantity) {
            throw new BadRequestException(
                `Insufficient stock. Only ${variant.stock} left.`,
            );
        }

        cart.items[itemIndex].quantity = quantity;
        await this.redisService.del(`cart:${userId}`);
        this.logger.log(
            `Item quantity updated for productId ${productId} and variantId ${variantId} in cart for user ${userId}.`,
        );
        return cart.save();
    }

    async clearCart(userId: string, session?: ClientSession): Promise<void> {
        const cart = await this._getFreshCartByUserId(userId);
        if (cart) {
            cart.items = [];
            await cart.save({ session });
            await this.redisService.del(`cart:${userId}`);
            this.logger.log(`Cart for user ${userId} has been cleared.`);
        }
    }

    // async validateCartStock(userId: string): Promise<{ isCheckoutable: boolean; invalidItems: any[] }> { ... }
}
