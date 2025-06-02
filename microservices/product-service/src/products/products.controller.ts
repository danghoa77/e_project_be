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
import { RolesGuard, Roles, Role, JwtAuthGuard } from '@app/common-auth';



@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

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
    @Patch('update-stock/:id')
    async updateStock(
        @Param('id') productId: string,
        @Body('variantId') variantId: string,
        @Body('quantity') quantity: number,
        @Body('operation') operation: 'increase' | 'decrease'
    ) {
        return this.productsService.updateVariantStock(productId, variantId, quantity, operation);
    }

    @Patch(':id')
    // @UseGuards(JwtAuthGuard, RolesGuard)
    // @Roles(Role.Admin)
    @UseInterceptors(FilesInterceptor('images', 5))
    async update(
        @Param('id') id: string,
        @Body() updateProductDto: UpdateProductDto,
        @UploadedFiles() files?: Array<Express.Multer.File>,
    ) {
        return this.productsService.update(id, updateProductDto, files);
    }

    @Delete(':id')
    // @UseGuards(JwtAuthGuard, RolesGuard)
    // @Roles('admin')
    async remove(@Param('id') id: string) {
        return this.productsService.remove(id);
    }
}