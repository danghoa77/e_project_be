// product-service/src/products/products.controller.ts
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
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { RolesGuard, Role, JwtAuthGuard } from '@app/common-auth';



@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Role('admin')
    @Post()
    @UseInterceptors(FilesInterceptor('images', 5))
    async create(
        @Body() createProductDto: CreateProductDto,
        @UploadedFiles() files: Array<Express.Multer.File>,
    ) {
        return this.productsService.create(createProductDto, files);
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
    @Patch('update-stock/:id')
    async updateStock(
        @Param('id') productId: string,
        @Body('variantId') variantId: string,
        @Body('quantity') quantity: number,
        @Body('operation') operation: 'increase' | 'decrease'
    ) {
        return this.productsService.updateVariantStock(productId, variantId, quantity, operation);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Role('admin')
    @Patch(':id')
    @UseInterceptors(FilesInterceptor('images', 5))
    async update(
        @Param('id') id: string,
        @Body() updateProductDto: UpdateProductDto,
        @UploadedFiles() files?: Array<Express.Multer.File>,
    ) {
        return this.productsService.update(id, updateProductDto, files);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Role('admin')
    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.productsService.remove(id);
    }
}