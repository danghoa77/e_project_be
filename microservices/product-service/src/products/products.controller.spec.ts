import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';

// 1. Tạo một phiên bản "giả" (mock) của ProductsService
const mockProductsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
};

describe('ProductsController', () => {
    let controller: ProductsController;
    let service: ProductsService;

    beforeEach(async () => {
        // 2. Tạo một module test, cung cấp controller thật và service giả
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ProductsController],
            providers: [
                {
                    provide: ProductsService,
                    useValue: mockProductsService, // Khi ai đó hỏi ProductsService, hãy đưa cho họ phiên bản giả
                },
            ],
        }).compile();

        controller = module.get<ProductsController>(ProductsController);
        service = module.get<ProductsService>(ProductsService); // Lấy cả service giả để kiểm tra
    });

    // Một bài test đơn giản để đảm bảo controller được tạo
    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    // Test cho endpoint GET /products
    describe('findAll', () => {
        it('should call service.findAll with correct query and return its result', async () => {
            // Arrange: Chuẩn bị dữ liệu
            const mockQuery: ProductQueryDto = { page: 1, limit: 10 };
            const mockResult = { data: [], total: 0 };
            mockProductsService.findAll.mockResolvedValue(mockResult); // Giả lập service trả về kết quả

            // Act: Gọi hàm controller
            const result = await controller.findAll(mockQuery);

            // Assert: Kiểm chứng
            expect(service.findAll).toHaveBeenCalledWith(mockQuery); // Kiểm tra service có được gọi với đúng tham số không
            expect(result).toEqual(mockResult); // Kiểm tra controller có trả về đúng kết quả từ service không
        });
    });

    // Test cho endpoint GET /products/:id
    describe('findOne', () => {
        it('should call service.findOne with correct id and return its result', async () => {
            const mockId = 'some-id';
            const mockResult = { _id: mockId, name: 'Test Product' };
            mockProductsService.findOne.mockResolvedValue(mockResult);

            const result = await controller.findOne(mockId);

            expect(service.findOne).toHaveBeenCalledWith(mockId);
            expect(result).toEqual(mockResult);
        });
    });

    // Test cho endpoint POST /products
    describe('create', () => {
        it('should call service.create with DTO and files and return the processed result', async () => {
            // Arrange (Chuẩn bị)
            const createProductDto: CreateProductDto = {
                name: 'New T-Shirt',
                category: 'T-Shirts',
                variants: [{ size: "L", color: "Black", price: 250000, stock: 100 }], // Dữ liệu đầu vào từ client
                images: [{
                    url: 'http://cloudinary.com/some-image.jpg',
                    cloudinaryId: 'some-cloudinary-id'
                }],
            };
            const mockFiles: Array<Express.Multer.File> = [/* một file giả ở đây */];

            // SỬA LẠI Ở ĐÂY:
            // mockResult phải phản ánh đúng dữ liệu SAU KHI service đã xử lý (parse JSON, thêm _id, images,...)
            const mockResult = {
                _id: 'new-product-id-123',
                name: 'New T-Shirt',
                category: 'T-Shirts',
                // 'variants' giờ là một mảng object, không phải chuỗi
                variants: [{
                    size: "L",
                    color: "Black",
                    price: 250000,
                    stock: 100
                }],
                // Giả lập một mảng ảnh trả về sau khi đã upload
                images: [{
                    url: 'http://cloudinary.com/some-image.jpg',
                    cloudinaryId: 'some-cloudinary-id'
                }],
            };

            // Giả lập service trả về kết quả đã được xử lý hoàn chỉnh
            mockProductsService.create.mockResolvedValue(mockResult);

            // Act (Hành động): Gọi hàm controller
            const result = await controller.create(createProductDto, mockFiles);

            // Assert (Kiểm chứng)
            // 1. Kiểm tra xem controller có gọi service với đúng dữ liệu đầu vào không
            expect(service.create).toHaveBeenCalledWith(createProductDto, mockFiles);
            // 2. Kiểm tra xem controller có trả về đúng kết quả mà service cung cấp không
            expect(result).toEqual(mockResult);
        });
    });
});