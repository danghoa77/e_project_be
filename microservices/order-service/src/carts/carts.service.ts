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
  salePrice?: number;
  name?: string;
  size?: string;
  color?: string;
}

interface ProductData {
  variants: ProductVariant[];
  name?: string;
  imageUrl?: string;
}

@Injectable()
export class CartsService {
  private readonly logger = new Logger(CartsService.name);

  constructor(
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    private readonly httpService: HttpService,
    private readonly redisService: RedisService,
  ) { }


  private async _getFreshCartByUserId(userId: string): Promise<CartDocument> {
    const objectUserId = new Types.ObjectId(userId);
    let cart = await this.cartModel.findOne({ userId: objectUserId }).exec();
    if (!cart) {
      this.logger.log(`No cart found for user ${userId}. Creating a new one.`);
      cart = new this.cartModel({
        userId: objectUserId,
        items: [],
      });
    }
    return cart;
  }

  private async _getProductVariant(
    productId: string,
    variantId: string,
  ): Promise<{ productData: ProductData; variant: ProductVariant }> {
    const productUrl = `http://product-service:3000/products/${productId}`;

    let response;
    try {
      response = await firstValueFrom(this.httpService.get(productUrl));
    } catch (err) {
      this.logger.error(
        `Failed to fetch product ${productId} from product-service: ${err}`,
      );
      throw new NotFoundException(`Product with ID ${productId} not found.`);
    }

    const productData: ProductData = response?.data;
    if (!productData || !Array.isArray(productData.variants)) {
      throw new NotFoundException(
        `Product data is invalid for ID ${productId}.`,
      );
    }

    const found = productData.variants.find(
      (v: any) => v._id?.toString() === variantId || v._id === variantId,
    );

    if (!found) {
      throw new BadRequestException(
        `Product variant with ID ${variantId} does not exist.`,
      );
    }
    const variant: ProductVariant = {
      _id: found._id.toString ? found._id.toString() : String(found._id),
      stock: Number(found.stock ?? 0),
      price: Number(found.price ?? 0),
      salePrice: found.salePrice ? Number(found.salePrice) : undefined,
      name: found.name,
      size: found.size,
      color: found.color,
    };
    console.log(productData);
    return { productData, variant };
  }

  async getCartByUserId(userId: string): Promise<CartDocument | any> {
    const cacheKey = `cart:${userId}`;
    try {
      const cachedCart = await this.redisService.get(cacheKey);
      if (cachedCart) {
        this.logger.log(`Cart for user ${userId} found in Redis cache.`);
        return JSON.parse(cachedCart);
      }
    } catch (err) {
      this.logger.warn(`Redis get failed for key ${`cart:${userId}`}: ${err}`);
    }

    this.logger.log(`Cart for user ${userId} not in cache. Finding in DB...`);
    const cart = await this._getFreshCartByUserId(userId);

    await cart.save();

    try {
      await this.redisService.set(
        cacheKey,
        JSON.stringify(cart.toObject ? cart.toObject() : cart),
        3600,
      );
      this.logger.log(`Caching cart for user ${userId}.`);
    } catch (err) {
      this.logger.warn(`Redis set failed for key ${cacheKey}: ${err}`);
    }

    return cart.toObject ? cart.toObject() : cart;
  }

  async addItemToCart(
    userId: string,
    addItemDto: AddToCartDto,
  ): Promise<CartDocument> {
    const { productId, variantId, quantity, imageUrl } = addItemDto;

    if (!productId || !variantId || !quantity || quantity <= 0) {
      throw new BadRequestException('Invalid addItemDto payload.');
    }

    const { variant } = await this._getProductVariant(productId, variantId);
    console.log('variant', variant);
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
      cart.items[existingItemIndex].imageUrl = addItemDto.imageUrl;
      cart.items[existingItemIndex].price = variant.price;
    } else {
      cart.items.push({
        productId: new Types.ObjectId(productId),
        variantId,
        name: addItemDto.name,
        quantity,
        imageUrl: addItemDto.imageUrl,
        price: variant.price,
      });
    }

    try {
      await this.redisService.del(`cart:${userId}`);
    } catch (err) {
      this.logger.warn(`Redis del failed for cart:${userId}: ${err}`);
    }

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
      throw new NotFoundException(
        `Không tìm thấy sản phẩm với productId ${productId} và variantId ${variantId} trong giỏ hàng.`,
      );
    }

    const objectUserId = new Types.ObjectId(userId);
    const objectProductId = new Types.ObjectId(productId);

    const updatedCart = await this.cartModel.findOneAndUpdate(
      { userId: objectUserId },
      {
        $pull: {
          items: {
            productId: objectProductId,
            variantId,
          },
        },
      },
      { new: true },
    );

    try {
      await this.redisService.del(`cart:${userId}`);
    } catch (err) {
      this.logger.warn(`Redis del failed for cart:${userId}: ${err}`);
    }

    this.logger.log(
      `Item with productId ${productId} and variantId ${variantId} removed from cart for user ${userId}.`,
    );

    if (!updatedCart) {
      throw new NotFoundException('Cart not found');
    }
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

    const { variant } = await this._getProductVariant(productId, variantId);
    if (variant.stock < quantity) {
      throw new BadRequestException(
        `Insufficient stock. Only ${variant.stock} left.`,
      );
    }

    cart.items[itemIndex].quantity = quantity;
    // keep price updated
    cart.items[itemIndex].price = variant.price;

    try {
      await this.redisService.del(`cart:${userId}`);
    } catch (err) {
      this.logger.warn(`Redis del failed for cart:${userId}: ${err}`);
    }

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
      try {
        await this.redisService.del(`cart:${userId}`);
      } catch (err) {
        this.logger.warn(`Redis del failed for cart:${userId}: ${err}`);
      }
      this.logger.log(`Cart for user ${userId} has been cleared.`);
    }
  }

  // nếu cần, tao có thể implement validateCartStock(...) để check toàn bộ giỏ
}
