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
import { BulkUpdateStockDto } from './dto/bulk-update-stock.dto';


@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Role('admin')
    @UseInterceptors(FilesInterceptor('files', 5))
    async create(
        @UploadedFiles() files: Express.Multer.File[],
        @Body('dto') dto: string
    ) {
        const parsedDto: CreateProductDto = JSON.parse(dto);

        return this.productsService.create(parsedDto, files);
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

    @Patch('stock/decrease')
    async decreaseStock(@Body() bulkUpdateStockDto: BulkUpdateStockDto) {
        return this.productsService.decreaseStockForOrder(bulkUpdateStockDto.items);
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