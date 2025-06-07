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
        this.logger.log(`Created product: ${createdProduct}`);
        // Invalidate product list cache
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

        // Try to get from cache first for common queries
        const cacheKey = `products:${JSON.stringify(query)}`;
        const cachedProducts = await this.redisService.get(cacheKey);
        console.log('Finall');
        if (cachedProducts) {
            console.log('Products from Redis cache');
            const parsed = JSON.parse(cachedProducts);
            return { products: parsed.products, total: parsed.total };
        }

        const filter: any = {};
        if (category) {
            filter.category = category;
        }
        if (priceMin || priceMax) {
            filter['variants.price'] = {};
            if (priceMin) filter['variants.price'].$gte = priceMin;
            if (priceMax) filter['variants.price'].$lte = priceMax;
        }
        if (size) {
            filter['variants.size'] = size;
        }

        const skip = (page - 1) * limit;
        const sort: any = {};
        if (sortBy) {
            if (sortBy.startsWith('-')) {
                sort[sortBy.substring(1)] = -1; // Descending
            } else {
                sort[sortBy] = 1; // Ascending
            }
        } else {
            sort.createdAt = -1; // Default: newest first
        }


        const [products, total] = await Promise.all([
            this.productModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
            this.productModel.countDocuments(filter).exec(),
        ]);

        // Cache the result
        this.logger.log(`Found ${products.length} products.`);
        await this.redisService.set(cacheKey, JSON.stringify({ products, total }), 60 * 5); // Cache 5 phút
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
        if (!product) {
            throw new NotFoundException('Product does not exist.');
        }

        if (files && files.length > 0) {
            if (product.images && product.images.length > 0) {
                const deletePromises = product.images.map(img => this.cloudinaryService.deleteImage(img.cloudinaryId));
                await Promise.all(deletePromises);
            }
            // Upload new images
            const uploadPromises = files.map(file => this.cloudinaryService.uploadImage(file));
            const results = await Promise.all(uploadPromises);
            updateProductDto.images = results.map(res => ({
                url: res.secure_url,
                cloudinaryId: res.public_id,
            }));
        } else if (updateProductDto.images === null) {
            // If images is set to null, delete existing images
            if (product.images && product.images.length > 0) {
                const deletePromises = product.images.map(img => this.cloudinaryService.deleteImage(img.cloudinaryId));
                await Promise.all(deletePromises);
            }
            updateProductDto.images = [];
        }

        Object.assign(product, updateProductDto);
        const updatedProduct = await product.save();
        this.logger.log(`Updated product: ${updatedProduct}`);
        await this.redisService.del(`product:${id}`);
        await this.redisService.del('products:all');
        return updatedProduct;
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
        await this.redisService.del(`product:${id}`);
        await this.redisService.del('products:all');
    }
}