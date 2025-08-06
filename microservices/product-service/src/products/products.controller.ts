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
    BadRequestException,
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


@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Role('admin')
    @UseInterceptors(FilesInterceptor('files', 5))
    async create(
        @UploadedFiles() files: Express.Multer.File[],
        @Body('dto') dto?: string,
        @Body() body?: any
    ) {
        let parsedDto: CreateProductDto;

        if (dto) {
            try {
                parsedDto = JSON.parse(dto);
            } catch (e) {
                throw new BadRequestException('Invalid JSON in dto field');
            }
        } else {
            parsedDto = body;
        }

        return this.productsService.create(parsedDto, files || []);
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
        // ✅ Dữ liệu DTO vẫn được nhận dưới dạng chuỗi thô
        @Body('updateProductDto') updateProductDtoRaw: string,
        @UploadedFiles() files?: Array<Express.Multer.File>,
    ) {
        // 1. Parse chuỗi JSON
        // Nếu không có dữ liệu gửi lên, coi như là một object rỗng
        let parsedObject: object;
        try {
            parsedObject = updateProductDtoRaw ? JSON.parse(updateProductDtoRaw) : {};
        } catch (e) {
            throw new BadRequestException('Dữ liệu JSON trong trường updateProductDto không hợp lệ.');
        }

        // 2. Chuyển object thường thành một instance của UpdateProductDto
        // Điều này cần thiết để class-validator có thể nhận diện các decorator (@IsNotEmpty, etc.)
        const dtoInstance = plainToInstance(UpdateProductDto, parsedObject);

        // 3. Thực hiện validation thủ công
        const errors = await validate(dtoInstance);

        // 4. Nếu có lỗi, ném ra exception với thông báo chi tiết
        if (errors.length > 0) {
            // Lỗi này sẽ được gửi về frontend và bạn có thể thấy nó trong tab Network
            throw new BadRequestException(errors);
        }

        // 5. Nếu mọi thứ hợp lệ, gọi service với DTO đã được xác thực
        return this.productsService.update(id, dtoInstance, files);
    }


    @UseGuards(JwtAuthGuard, RolesGuard)
    @Role('admin')
    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.productsService.remove(id);
    }
}