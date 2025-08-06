// product-service/src/products/products.service.ts
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { Product } from '../schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { RedisService } from '@app/common-auth';
import { UpdateStockItemDto } from './dto/update-stock-item.dto';

@Injectable()
export class ProductsService {
    private readonly logger = new Logger(ProductsService.name);
    constructor(
        @InjectModel(Product.name) private productModel: Model<Product>,
        @InjectConnection() private readonly connection: Connection,
        private cloudinaryService: CloudinaryService,
        private redisService: RedisService,
    ) { }
    private async invalidateCache() {
        await this.redisService.set('products:cacheInvalidated', 'true', 60);
    }

    private async isCacheInvalidated(): Promise<boolean> {
        const flag = await this.redisService.get('products:cacheInvalidated');
        return flag === 'true';
    }

    async create(createProductDto: CreateProductDto, files: Array<Express.Multer.File>): Promise<Product> {
        const newProduct = new this.productModel(createProductDto);

        if (files && files.length > 0) {
            const uploadPromises = files.map(file => this.cloudinaryService.uploadImage(file));
            const results = await Promise.all(uploadPromises);
            newProduct.images = results.map(res => ({
                url: res.secure_url,
                cloudinaryId: res.public_id,
            }));
        }
        const createdProduct = await newProduct.save();
        await this.invalidateCache();
        this.logger.log(`Created product: ${createdProduct}`);
        await this.redisService.del('products:all');
        return createdProduct;
    }

    async updateVariantStock(productId: string, variantId: string, quantity: number, operation: 'increase' | 'decrease'): Promise<Product> {
        const product = await this.productModel.findById(productId).exec();
        if (!product) {
            throw new NotFoundException('Product does not exist.');
        }

        const variant = product.variants.find(v => String(v._id) === String(variantId));
        if (!variant) {
            throw new NotFoundException('Variant Product does not exist.');
        }

        if (operation === 'decrease') {
            if (variant.stock < quantity) {
                throw new BadRequestException('Insufficient inventory.');
            }
            variant.stock -= quantity;
        } else if (operation === 'increase') {
            variant.stock += quantity;
        } else {
            throw new BadRequestException('Invalid operation.');
        }

        const updatedProduct = await product.save();
        this.logger.log(`Updated stock for product ${productId}, variant ${variantId}: ${variant.stock}`);
        await this.redisService.del(`product:${productId}`);
        await this.redisService.del('products:all');

        return updatedProduct;
    }

    async decreaseStockForOrder(items: UpdateStockItemDto[]): Promise<{ message: string }> {
        const session = await this.connection.startSession();
        session.startTransaction();
        this.logger.log(`Starting transaction to decrease stock for ${items.length} items.`);

        try {
            for (const item of items) {
                const product = await this.productModel.findById(item.productId).session(session);

                if (!product) {
                    throw new NotFoundException(`Product with ID ${item.productId} not found.`);
                }

                const variant = product.variants.find(v => v._id.toString() === item.variantId);
                if (!variant) {
                    throw new BadRequestException(`Variant with ID ${item.variantId} not found.`);
                }
                if (variant.stock < item.quantity) {
                    throw new BadRequestException(`Insufficient stock for product ${product.name}, variant ${variant.size}-${variant.color}.`);
                }

                variant.stock -= item.quantity;
                await product.save({ session });
            }
            await session.commitTransaction();
            this.logger.log(`Stock decreased successfully. Transaction committed.`);
            return { message: 'Stock updated successfully' };

        } catch (error) {
            await session.abortTransaction();
            this.logger.error(`Failed to decrease stock. Transaction aborted.`, error.stack);
            throw error;
        } finally {
            session.endSession();
        }
    }

    async findAll(query: ProductQueryDto): Promise<{ products: Product[]; total: number }> {
        const { category, priceMin, priceMax, size, limit = 10, page = 1, sortBy } = query;

        const cacheInvalidated = await this.isCacheInvalidated();
        const cacheKey = `products:${JSON.stringify(query)}`;

        if (!cacheInvalidated) {
            const cachedProducts = await this.redisService.get(cacheKey);
            if (cachedProducts) {
                this.logger.log('📦 Returning products from Redis cache');
                const parsed = JSON.parse(cachedProducts);
                return { products: parsed.products, total: parsed.total };
            }
        } else {
            this.logger.log('🚨 Cache invalidated → fetching from DB');
        }

        // Build filter
        const filter: any = {};
        if (category) filter.category = category;
        if (priceMin || priceMax) {
            filter['variants.price'] = {};
            if (priceMin) filter['variants.price'].$gte = priceMin;
            if (priceMax) filter['variants.price'].$lte = priceMax;
        }
        if (size) filter['variants.size'] = size;

        const skip = (page - 1) * limit;
        const sort: any = sortBy
            ? (sortBy.startsWith('-') ? { [sortBy.substring(1)]: -1 } : { [sortBy]: 1 })
            : { createdAt: -1 };

        const [products, total] = await Promise.all([
            this.productModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
            this.productModel.countDocuments(filter).exec(),
        ]);

        await this.redisService.set(cacheKey, JSON.stringify({ products, total }), 60 * 5);
        await this.redisService.del('products:cacheInvalidated');

        this.logger.log(` DB queried, cached ${products.length} products`);
        return { products, total };
    }
    async findOne(id: string): Promise<Product> {
        const cachedProduct = await this.redisService.get(`product:${id}`);
        if (cachedProduct) {
            console.log('Product from Redis cache');
            return JSON.parse(cachedProduct);
        }

        const product = await this.productModel.findById(id).exec();
        if (!product) {
            throw new NotFoundException('Product does not exist.');
        }
        this.logger.log(`Found product: ${product}`);
        await this.redisService.set(`product:${id}`, JSON.stringify(product), 60 * 5); // Cache 5 phút
        return product;
    }

    async update(id: string, updateProductDto: UpdateProductDto, files?: Array<Express.Multer.File>): Promise<Product> {
        const product = await this.productModel.findById(id).exec();
        if (!product) throw new NotFoundException('Product does not exist.');

        if (updateProductDto.deletedImages?.length) {
            const toDelete = product.images.filter(img =>
                updateProductDto.deletedImages!.includes(img.cloudinaryId)
            );
            await Promise.all(toDelete.map(img => this.cloudinaryService.deleteImage(img.cloudinaryId)));
            product.images = product.images.filter(img =>
                !updateProductDto.deletedImages!.includes(img.cloudinaryId)
            );
        }

        if (files?.length) {
            const uploadResults = await Promise.all(files.map(file => this.cloudinaryService.uploadImage(file)));
            const newImages = uploadResults.map(res => ({
                url: res.secure_url,
                cloudinaryId: res.public_id
            }));
            if (!product.images) {
                product.images = [];
            }
            product.images.push(...newImages);
        }


        delete updateProductDto.deletedImages;
        delete updateProductDto.images;

        Object.assign(product, updateProductDto);

        const updated = await product.save();
        await this.invalidateCache();
        await this.redisService.del(`product:${id}`);
        await this.redisService.del('products:all');

        return updated;
    }



    async remove(id: string): Promise<void> {
        const product = await this.productModel.findById(id).exec();
        if (!product) {
            throw new NotFoundException('Product does not exist.');
        }


        if (product.images && product.images.length > 0) {
            const deletePromises = product.images.map(img => this.cloudinaryService.deleteImage(img.cloudinaryId));
            await Promise.all(deletePromises);
        }

        await this.productModel.deleteOne({ _id: id }).exec();
        this.logger.log(`Deleted product: ${id}`);
        await this.invalidateCache();
        await this.redisService.del(`product:${id}`);
        await this.redisService.del('products:all');
    }
}