// product-service/src/products/products.service.ts
import { Injectable, NotFoundException, BadRequestException, Logger, Inject } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { Product } from '../schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { RedisService } from '@app/common-auth';
import { UpdateStockItemDto } from './dto/update-stock-item.dto';
import { Category } from '../schemas/category.schema';
import { Rating } from '../schemas/rating.schema';
import { RatingDto } from './dto/rating.dto';

@Injectable()
export class ProductsService {
    private readonly logger = new Logger(ProductsService.name);
    constructor(
        @InjectModel(Product.name) private productModel: Model<Product>,
        @InjectModel(Category.name) private categoryModel: Model<Category>,
        @InjectConnection() private readonly connection: Connection,
        private cloudinaryService: CloudinaryService,
        private redisService: RedisService,
    ) { }


    async createRating(ratingDto: RatingDto): Promise<Product> {
        const product = await this.productModel.findById(ratingDto.productId).exec();
        if (!product) {
            throw new NotFoundException('Product does not exist.');
        }

        const existingRating = product.ratings.find(
            (r) => r.userId.toString() === ratingDto.userId.toString(),
        );

        if (existingRating) {
            throw new BadRequestException('You have already rated this product.');
        }

        const newRating = {
            userId: ratingDto.userId,
            rating: ratingDto.rating,
            comment: ratingDto.comment,
        } as Rating;

        product.ratings.push(newRating);
        await this.updateProductRating(product);

        return product.save();
    }


    async deleteRating(productId: string, userId: string): Promise<Product> {
        const product = await this.productModel.findById(productId).exec();
        if (!product) {
            throw new NotFoundException('Product does not exist.');
        }

        const ratingIndex = product.ratings.findIndex(
            (r) => r.userId.toString() === userId.toString(),
        );

        if (ratingIndex === -1) {
            throw new NotFoundException('Rating not found for this user.');
        }

        product.ratings.splice(ratingIndex, 1);
        await this.updateProductRating(product);

        return product.save();
    }   

    private async updateProductRating(product: Product): Promise<void> {
        const totalReviews = product.ratings.length;
        product.numReviews = totalReviews;

        if (totalReviews > 0) {
            const totalRating = product.ratings.reduce((acc, item) => item.rating + acc, 0);
            product.averageRating = totalRating / totalReviews;
        } else {
            product.averageRating = 0;
        }
    }



    async createCategory(name: string): Promise<Category> {
        try {
            const category = new this.categoryModel({ name });
            return await category.save();
        }
        catch (error) {
            this.logger.error('Error creating category', error);
            throw new BadRequestException('Could not create category');
        }
    }

    async updateCategory(id: string, name: string): Promise<Category> {
        try {
            const category = await this.categoryModel.findById(id).exec();
            if (!category) {
                throw new NotFoundException('Category not found');
            }
            category.name = name;
            return await category.save();
        }

        catch (error) {
            this.logger.error('Error updating category', error);
            throw new BadRequestException('Could not update category');
        }
    }


    async deleteCategory(id: string): Promise<{ message: string }> {
        try {
            await this.categoryModel.deleteOne({ _id: id }).exec();
            return { message: 'Category deleted successfully' }
        }
        catch (error) {
            this.logger.error('Error deleting category', error);
            throw new BadRequestException('Could not delete category');
        }
    }

    async findAllCategories(): Promise<Category[]> {
        try {
            return await this.categoryModel.find().exec();
        }
        catch (error) {
            this.logger.error('Error finding categories', error);
            throw new BadRequestException('Could not find categories');
        }
    }


    async create(createProductDto: CreateProductDto, files: Array<Express.Multer.File>): Promise<Product> {

        if (createProductDto.category) {
            const categoryExists = await this.categoryModel.findById(createProductDto.category).exec();
            if (!categoryExists) {
                throw new BadRequestException('Category does not exist.');
            }
        } else {
            const hasAnyCategory = await this.categoryModel.exists({});
            if (!hasAnyCategory) {
                throw new BadRequestException('No categories available. Please create a category first.');
            }
        }


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
        await this.redisService.del('products:all');
        return createdProduct;
    }

    async updateVariantStock(
        productId: string,
        colorVariantId: string,
        sizeOptionId: string,
        quantity: number,
        operation: 'increase' | 'decrease',
    ): Promise<Product> {
        const product = await this.productModel.findById(productId).exec();
        if (!product) {
            throw new NotFoundException('Product does not exist.');
        }

        const colorVariant = product.variants.find(
            (cv) => String(cv._id) === String(colorVariantId),
        );
        if (!colorVariant) {
            throw new NotFoundException('Color variant does not exist.');
        }

        const sizeOption = colorVariant.sizes.find(
            (s) => String(s._id) === String(sizeOptionId),
        );
        if (!sizeOption) {
            throw new NotFoundException('Size option does not exist.');
        }

        if (operation === 'decrease') {
            if (sizeOption.stock < quantity) {
                throw new BadRequestException('Insufficient inventory.');
            }
            sizeOption.stock -= quantity;
        } else if (operation === 'increase') {
            sizeOption.stock += quantity;
        } else {
            throw new BadRequestException('Invalid operation.');
        }

        const updatedProduct = await product.save();

        this.logger.log(
            `Updated stock for product ${productId}, colorVariant ${colorVariantId}, sizeOption ${sizeOptionId}: ${sizeOption.stock}`,
        );

        await this.redisService.del(`product:${productId}`);
        await this.redisService.del('products:all');

        return updatedProduct;
    }


    async decreaseStockForOrder(items: UpdateStockItemDto[]): Promise<{ message: string }> {
        try {
            for (const item of items) {
                const { productId, variantId, sizeId, quantity } = item;

                if (!sizeId) {
                    throw new BadRequestException(`sizeId is missing for product ${productId}`);
                }

                const result = await this.productModel.updateOne(
                    {
                        _id: productId,
                        'variants._id': variantId,
                    },
                    {
                        $inc: { 'variants.$[v].sizes.$[s].stock': -quantity },
                    },
                    {
                        arrayFilters: [
                            { 'v._id': variantId },
                            { 's._id': sizeId, 's.stock': { $gte: quantity } },
                        ],

                    },
                );

                if (result.modifiedCount === 0) {
                    throw new BadRequestException(
                        `Insufficient stock or invalid item details for product ${productId}, variant ${variantId}, size ${sizeId}.`,
                    );
                }
            }

            await this.redisService.del('products:all');
            this.logger.log('Stock updated successfully and cache cleared.');
            return { message: 'Stock updated successfully' };
        } catch (error) {
            this.logger.error('Failed to decrease stock, transaction aborted.', error.stack);
            throw error;
        }
    }

    async findAll(
        query: ProductQueryDto,
    ): Promise<{ products: Product[]; total: number }> {
        const {
            category,
            priceMin,
            priceMax,
            size,
            color,
            limit = 10,
            page = 1,
            sortBy,
        } = query;

        const cacheKey = `products:${JSON.stringify(query)}`;


        const cachedProducts = await this.redisService.get(cacheKey);
        if (cachedProducts) {
            this.logger.log('Returning products from Redis cache');
            const parsed = JSON.parse(cachedProducts);
            return { products: parsed.products, total: parsed.total };
        }


        const filter: any = {};

        if (category) filter.category = category;
        if (color) filter['variants.color'] = color;
        if (size) filter['variants.sizes.size'] = size;

        if (priceMin || priceMax) {
            filter['variants.sizes.price'] = {};
            if (priceMin) filter['variants.sizes.price'].$gte = priceMin;
            if (priceMax) filter['variants.sizes.price'].$lte = priceMax;
        }


        const skip = (page - 1) * limit;


        let sort: any = { createdAt: -1 };
        if (sortBy) {
            sort = sortBy.startsWith('-')
                ? { [sortBy.substring(1)]: -1 }
                : { [sortBy]: 1 };
        }


        const [products, total] = await Promise.all([
            this.productModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
            this.productModel.countDocuments(filter).exec(),
        ]);


        await this.redisService.set(
            cacheKey,
            JSON.stringify({ products, total }),
            60 * 5,
        );
        await this.redisService.del('products:cacheInvalidated');

        this.logger.log(`DB queried, cached ${products.length} products`);
        return { products, total };
    }


    async update(
        id: string,
        updateProductDto: UpdateProductDto,
        files?: Express.Multer.File[],
    ): Promise<Product> {
        const product = await this.productModel.findById(id).exec();
        if (!product) throw new NotFoundException('Product not found');


        if (updateProductDto.name) product.name = updateProductDto.name;
        if (updateProductDto.description) product.description = updateProductDto.description;
        if (updateProductDto.category) product.category = updateProductDto.category;


        if (updateProductDto.deletedImages?.length) {
            const toDelete = product.images.filter(img =>
                updateProductDto.deletedImages!.includes(img.cloudinaryId),
            );

            await Promise.all(
                toDelete.map(img =>
                    this.cloudinaryService.deleteImage(img.cloudinaryId),
                ),
            );

            product.images = product.images.filter(
                img => !updateProductDto.deletedImages!.includes(img.cloudinaryId),
            );
        }


        if (files?.length) {
            const uploadResults = await Promise.all(
                files.map(file => this.cloudinaryService.uploadImage(file)),
            );

            const newImages = uploadResults.map(res => ({
                url: res.secure_url,
                cloudinaryId: res.public_id,
            }));

            if (!product.images) product.images = [];
            product.images.push(...newImages);
        }


        if (updateProductDto.variants?.length) {
            updateProductDto.variants.forEach(updateVariant => {
                const existingVariant = product.variants.find(
                    v => v.color === updateVariant.color,
                );

                if (existingVariant) {
                    if (updateVariant.sizes?.length) {
                        updateVariant.sizes.forEach(updateSize => {
                            const existingSize = existingVariant.sizes.find(
                                s => s.size === updateSize.size,
                            );

                            if (existingSize) {
                                if (updateSize.price !== undefined) existingSize.price = updateSize.price;
                                if (updateSize.salePrice !== undefined) existingSize.salePrice = updateSize.salePrice;
                                if (updateSize.stock !== undefined) existingSize.stock = updateSize.stock;
                            } else {
                                existingVariant.sizes.push(updateSize as any);
                            }
                        });
                    }
                } else {
                    product.variants.push(updateVariant as any);
                }
            });
        }


        if (updateProductDto.deletedVariants?.length) {
            product.variants = product.variants.filter(
                v => !updateProductDto.deletedVariants!.includes(v._id.toString()),
            );
        }

        if (updateProductDto.deletedSizes?.length) {
            product.variants.forEach(variant => {
                variant.sizes = variant.sizes.filter(
                    s => !updateProductDto.deletedSizes!.includes(s._id.toString()),
                );
            });
        }

        await product.save();
        return product;
    }



    async findOne(id: string): Promise<Product> {
        const cachedProduct = await this.redisService.get(`product:${id}`);
        if (cachedProduct) {
            return JSON.parse(cachedProduct);
        }

        const product = await this.productModel.findById(id).exec();
        if (!product) {
            throw new NotFoundException('Product does not exist.');
        }
        await this.redisService.set(`product:${id}`, JSON.stringify(product), 60 * 5);
        return product;
    }


    async remove(id: string): Promise<any> {
        const product = await this.productModel.findById(id).exec();
        if (!product) {
            throw new NotFoundException('Product does not exist.');
        }

        if (product.images && product.images.length > 0) {
            const deletePromises = product.images.map(img => this.cloudinaryService.deleteImage(img.cloudinaryId));
            await Promise.all(deletePromises);
        }

        await this.productModel.deleteOne({ _id: id }).exec();
        await this.redisService.del(`product:${id}`);
        await this.redisService.del('products:all');
    }
}
