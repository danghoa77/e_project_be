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



interface ProductVariantSize {
  _id: string;
  size: string;
  price: number;
  salePrice?: number;
  stock: number;
}

interface ProductVariant {
  _id: string;
  color: string;
  sizes: ProductVariantSize[];
}


interface ProductData {
  _id: string;
  name: string;
  images: { url: string }[];
  variants: ProductVariant[];
  category: {
    _id: string;
    name: string;
  };
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
    sizeId: string,
  ): Promise<{ productData: ProductData; variant: ProductVariant; size: ProductVariantSize }> {
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

    const foundVariant = productData.variants.find(
      (v) => v._id.toString() === variantId,
    );
    if (!foundVariant) {
      throw new BadRequestException(
        `Variant with ID ${variantId} does not exist for product ${productId}.`,
      );
    }

    const foundSize = foundVariant.sizes.find(
      (s) => s._id.toString() === sizeId,
    );
    if (!foundSize) {
      throw new BadRequestException(
        `Size with ID ${sizeId} does not exist for variant ${variantId}.`,
      );
    }

    return { productData, variant: foundVariant, size: foundSize };
  }

  async getCartByUserId(userId: string): Promise<any[]> {
    const objectUserId = new Types.ObjectId(userId);
    const cart = await this.cartModel.findOne({ userId: objectUserId }).exec();

    if (!cart || cart.items.length === 0) return [];

    const products = await Promise.all(
      cart.items.map(async (item) => {
        const url = `http://product-service:3000/products/${item.productId}`;
        const res = await firstValueFrom(this.httpService.get(url));
        const product: ProductData = res.data;

        const variant = product.variants.find((v) => v._id === item.variantId);
        if (!variant) {
          throw new Error(
            `Variant ${item.variantId} not found for product ${product._id}`,
          );
        }

        const sizeOption = variant.sizes.find((s) => s._id === item.sizeId);
        if (!sizeOption) {
          throw new Error(
            `Size ${item.sizeId} not found for variant ${variant._id} in product ${product._id}`,
          );
        }

        const finalPrice =
          sizeOption.salePrice && sizeOption.salePrice > 0
            ? sizeOption.salePrice
            : sizeOption.price;
        return {
          productId: product._id,
          name: product.name,
          variantId: variant._id,
          sizeId: sizeOption._id,
          categoryId: product.category._id,
          imageUrl: product.images[0]?.url,
          size: sizeOption.size,
          color: variant.color,
          price: finalPrice,
          quantity: item.quantity,
          total: finalPrice * item.quantity,
        };
      }),
    );

    return products;
  }


  async addItemToCart(
    userId: string,
    addItemDto: AddToCartDto,
  ): Promise<CartDocument> {
    const { productId, variantId, sizeId, quantity, categoryId } = addItemDto;

    if (!productId || !variantId || !sizeId || !quantity || quantity <= 0) {
      throw new BadRequestException('Invalid addItemDto payload.');
    }

    const { size } = await this._getProductVariant(productId, variantId, sizeId);
    if (size.stock < quantity) {
      throw new BadRequestException(
        `Insufficient stock for size ${sizeId}. Only ${size.stock} left.`,
      );
    }

    const cart = await this._getFreshCartByUserId(userId);

    const existingItem = cart.items.find(
      (item) =>
        item.productId.toString() === productId &&
        item.variantId === variantId &&
        item.sizeId === sizeId &&
        item.categoryId === categoryId
    );

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > size.stock) {
        throw new BadRequestException(
          `Cannot add. Total quantity in cart (${newQuantity}) exceeds stock (${size.stock}).`,
        );
      }
      existingItem.quantity = newQuantity;
    } else {
      cart.items.push({
        productId: new Types.ObjectId(productId),
        variantId,
        sizeId,
        categoryId,
        quantity,
      });
    }

    await this.redisService.del(`cart:${userId}`);
    return cart.save();
  }

  async removeItemFromCart(
    userId: string,
    productId: string,
    variantId: string,
    sizeId: string,
  ): Promise<CartDocument | null> {
    const cart = await this._getFreshCartByUserId(userId);

    const itemExists = cart.items.some(
      (item) =>
        item.productId.toString() === productId &&
        item.variantId === variantId &&
        item.sizeId === sizeId,
    );

    if (!itemExists) {
      throw new NotFoundException(
        `Cannot find item with productId ${productId}, variantId ${variantId}, sizeId ${sizeId} in cart.`,
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
            sizeId,
          },
        },
      },
      { new: true },
    );

    await this.redisService.del(`cart:${userId}`);
    return updatedCart;
  }

  async increaseItemQuantity(
    userId: string,
    productId: string,
    variantId: string,
    sizeId: string,
  ): Promise<CartDocument | null> {
    const cart = await this._getFreshCartByUserId(userId);
    const item = cart.items.find(
      (i) =>
        i.productId.toString() === productId &&
        i.variantId === variantId &&
        i.sizeId === sizeId,
    );

    if (!item) {
      throw new NotFoundException('Item not found in cart.');
    }

    const { size } = await this._getProductVariant(productId, variantId, sizeId);
    if (item.quantity + 1 > size.stock) {
      throw new BadRequestException(
        `Cannot increase. Stock only ${size.stock} left.`,
      );
    }

    item.quantity += 1;
    await this.redisService.del(`cart:${userId}`);
    return cart.save();
  }

  async decreaseItemQuantity(
    userId: string,
    productId: string,
    variantId: string,
    sizeId: string,
  ): Promise<CartDocument | null> {
    const cart = await this._getFreshCartByUserId(userId);
    const itemIndex = cart.items.findIndex(
      (i) =>
        i.productId.toString() === productId &&
        i.variantId === variantId &&
        i.sizeId === sizeId,
    );

    if (itemIndex === -1) {
      throw new NotFoundException('Item not found in cart.');
    }

    const item = cart.items[itemIndex];
    if (item.quantity > 1) {
      item.quantity -= 1;
    } else {
      cart.items.splice(itemIndex, 1);
    }

    await this.redisService.del(`cart:${userId}`);
    return cart.save();
  }

  async updateItemQuantity(
    userId: string,
    productId: string,
    variantId: string,
    sizeId: string,
    quantity: number,
  ): Promise<CartDocument | null> {
    if (quantity <= 0) {
      return this.removeItemFromCart(userId, productId, variantId, sizeId);
    }

    const cart = await this._getFreshCartByUserId(userId);
    const itemIndex = cart.items.findIndex(
      (item) =>
        item.productId.toString() === productId &&
        item.variantId === variantId &&
        item.sizeId === sizeId,
    );


    if (itemIndex === -1) {
      throw new NotFoundException('Item not found in cart.');
    }

    const { size } = await this._getProductVariant(productId, variantId, sizeId);
    if (size.stock < quantity) {
      throw new BadRequestException(
        `Insufficient stock. Only ${size.stock} left.`,
      );
    }

    cart.items[itemIndex].quantity = quantity;

    await this.redisService.del(`cart:${userId}`);
    return cart.save();
  }

  async clearCart(userId: string, session?: ClientSession): Promise<any[]> {
    const cart = await this._getFreshCartByUserId(userId);
    if (cart) {
      cart.items = [];
      await cart.save({ session });
      await this.redisService.del(`cart:${userId}`);
    }
    return [];
  }

}
