import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';

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
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ProductsController],
            providers: [
                {
                    provide: ProductsService,
                    useValue: mockProductsService,
                },
            ],
        }).compile();

        controller = module.get<ProductsController>(ProductsController);
        service = module.get<ProductsService>(ProductsService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('findAll', () => {
        it('should call service.findAll with correct query and return its result', async () => {
            const mockQuery: ProductQueryDto = { page: 1, limit: 10 };
            const mockResult = { data: [], total: 0 };
            mockProductsService.findAll.mockResolvedValue(mockResult);

            const result = await controller.findAll(mockQuery);

            expect(service.findAll).toHaveBeenCalledWith(mockQuery);
            expect(result).toEqual(mockResult);
        });
    });

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

    describe('create', () => {
        it('should call service.create with DTO and files and return the processed result', async () => {
            const createProductDto: CreateProductDto = {
                name: 'New T-Shirt',
                category: 'T-Shirts',
                variants: [{ size: "L", color: "Black", price: 250000, stock: 100 }],
                description: 'This is a description',
                images: [{
                    url: 'http://cloudinary.com/some-image.jpg',
                    cloudinaryId: 'some-cloudinary-id'
                }],
            };
            const mockFiles: Array<Express.Multer.File> = [];

            const mockResult = {
                _id: 'new-product-id-123',
                name: 'New T-Shirt',
                category: 'T-Shirts',
                description: 'This is a description',
                variants: [{
                    size: "L",
                    color: "Black",
                    price: 250000,
                    stock: 100
                }],
                images: [{
                    url: 'http://cloudinary.com/some-image.jpg',
                    cloudinaryId: 'some-cloudinary-id'
                }],
            };

            mockProductsService.create.mockResolvedValue(mockResult);

            // const result = await controller.create(createProductDto, mockFiles);

            expect(service.create).toHaveBeenCalledWith(createProductDto, mockFiles);
            // expect(result).toEqual(mockResult);
        });
    });
});
