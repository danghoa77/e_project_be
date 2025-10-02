import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    UseInterceptors,
    UploadedFiles,
    Query,
    BadRequestException,
    Req,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { RolesGuard, Role, JwtAuthGuard } from '@app/common-auth';
import { BulkUpdateStockDto } from './dto/bulk-update-stock.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RatingDto } from './dto/rating.dto';

@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Role('admin')
    @UseInterceptors(FilesInterceptor('images', 5))
    async create(
        @UploadedFiles() files: Express.Multer.File[],
        @Body('dto') dto: string
    ) {
        let parsedDto: CreateProductDto;
        try {
            parsedDto = JSON.parse(dto);
        } catch (e) {
            throw new BadRequestException('Invalid JSON in dto field');
        }

        return this.productsService.create(parsedDto, files || []);
    }

    @UseGuards(JwtAuthGuard)
    @Post('rating')
    async createRating(@Body() body: RatingDto) {
        return this.productsService.createRating(body);
    }


    @Get()
    async findAll(@Query() query: ProductQueryDto) {
        return this.productsService.findAll(query);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.productsService.findOne(id);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Role('admin')
    @Patch(':id')
    @UseInterceptors(FilesInterceptor('images', 5))
    async update(
        @Param('id') id: string,
        @UploadedFiles() files: Array<Express.Multer.File>,
        @Body('dto') dto: string,
    ) {
        let parsedDto: UpdateProductDto;

        try {
            parsedDto = JSON.parse(dto);
        } catch (e) {
            throw new BadRequestException('Invalid JSON in updateProductDto field');
        }

        const dtoInstance = plainToInstance(UpdateProductDto, parsedDto);
        const errors = await validate(dtoInstance);
        if (errors.length > 0) {
            throw new BadRequestException(errors);
        }

        return this.productsService.update(id, dtoInstance, files);
    }


    @UseGuards(JwtAuthGuard, RolesGuard)
    @Role('admin')
    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.productsService.remove(id);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Role('admin')
    @Patch('update-stock/:id')
    async updateStock(
        @Param('id') productId: string,
        @Body('quantity') quantity: number,
        @Body('operation') operation: 'increase' | 'decrease',
        @Body('colorVariantId') colorVariantId: string,
        @Body('sizeOptionId') sizeOptionId: string,
    ) {
        return this.productsService.updateVariantStock(
            productId,
            colorVariantId,
            sizeOptionId,
            quantity,
            operation,
        );
    }

    @Patch('stock/decrease')
    async decreaseStock(@Body() bulkUpdateStockDto: BulkUpdateStockDto) {
        return this.productsService.decreaseStockForOrder(bulkUpdateStockDto.items);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Role('admin')
    @Post('category')
    async createCategory(@Body('name') name: string) {
        return this.productsService.createCategory(name);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Role('admin')
    @Patch('category/:id')
    async updateCategory(@Param('id') id: string, @Body('name') name: string) {
        return this.productsService.updateCategory(id, name);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Role('admin')
    @Delete('category/:id')
    async deleteCategory(@Param('id') id: string) {
        return this.productsService.deleteCategory(id);
    }

    @Get('categories/all')
    async findAllCategories() {
        return this.productsService.findCategories();
    }


    @Get('categories/:id')
    async getCategoryById(@Param('id') id: string) {
        return this.productsService.findCategories(id);
    }


    @UseGuards(JwtAuthGuard)
    @Delete(':productId/rating')
    async deleteRating(
        @Req() req: any,
        @Param('productId') productId: string,
    ) {
        const userId = req.user.userId;
        return this.productsService.deleteRating(productId, userId);
    }
}
