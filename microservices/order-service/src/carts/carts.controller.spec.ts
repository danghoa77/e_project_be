import { Test, TestingModule } from '@nestjs/testing';
import { CartsController } from './carts.controller';
import { CartsService } from './carts.service';
import { AddToCartDto } from './dto/add-to-cart.dto';

// 1. Mock CartsService
const mockCartsService = {
    getCartByUserId: jest.fn(),
    addItemToCart: jest.fn(),
};

describe('CartsController', () => {
    let controller: CartsController;
    let service: CartsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CartsController],
            providers: [
                {
                    provide: CartsService,
                    useValue: mockCartsService,
                },
            ],
        }).compile();

        controller = module.get<CartsController>(CartsController);
        service = module.get<CartsService>(CartsService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    // Test endpoint GET /
    describe('getCart', () => {
        it('should call cartsService.getCartByUserId with the correct userId', async () => {
            // Arrange
            const mockUserId = 'user-123';
            const mockReq = { user: { userId: mockUserId } };
            const mockCart = { userId: mockUserId, items: [] };
            mockCartsService.getCartByUserId.mockResolvedValue(mockCart);

            // Act
            const result = await controller.getCart(mockReq);

            // Assert
            expect(service.getCartByUserId).toHaveBeenCalledWith(mockUserId);
            expect(result).toEqual(mockCart);
        });
    });

    // Test endpoint POST /
    describe('addItem', () => {
        it('should call cartsService.addItemToCart with correct userId and DTO', async () => {
            // Arrange
            const mockUserId = 'user-123';
            const mockReq = { user: { userId: mockUserId } };
            const mockAddItemDto: AddToCartDto = {
                productId: 'product-abc',
                variantId: 'variant-xyz',
                quantity: 2,
            };
            const mockUpdatedCart = { userId: mockUserId, items: [mockAddItemDto] };
            mockCartsService.addItemToCart.mockResolvedValue(mockUpdatedCart);

            // Act
            const result = await controller.addItem(mockReq, mockAddItemDto);

            // Assert
            expect(service.addItemToCart).toHaveBeenCalledWith(mockUserId, mockAddItemDto);
            expect(result).toEqual(mockUpdatedCart);
        });
    });
});