import { Test, TestingModule } from '@nestjs/testing';
import { CartsController, AuthenticatedRequest } from './carts.controller';
import { CartsService } from './carts.service';
import { AddToCartDto } from './dto/add-to-cart.dto';



const mockCartsService = {
  getCartByUserId: jest.fn(),
  addItemToCart: jest.fn(),
  removeItemFromCart: jest.fn(),
  updateItemQuantity: jest.fn(),
  clearCart: jest.fn(),
};

describe('CartsController', () => {
  let controller: CartsController;

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
      const result = await controller.getCart(mockReq as AuthenticatedRequest);

      // Assert
      expect(mockCartsService.getCartByUserId).toHaveBeenCalledWith(mockUserId);
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
        // price: 50.0,
      };
      const mockUpdatedCart = { userId: mockUserId, items: [mockAddItemDto] };
      mockCartsService.addItemToCart.mockResolvedValue(mockUpdatedCart);

      // Act
      const result = await controller.addItem(mockReq as AuthenticatedRequest, mockAddItemDto);

      // Assert
      expect(mockCartsService.addItemToCart).toHaveBeenCalledWith(
        mockUserId,
        mockAddItemDto,
      );
      expect(result).toEqual(mockUpdatedCart);
    });
  });

  describe('removeItem', () => {
    it('should call cartsService.removeItemFromCart with correct userId, productId, and variantId', async () => {
      const mockUserId = 'user-123';
      const mockReq = { user: { userId: mockUserId } };
      const mockProductId = 'product-abc';
      const mockVariantId = 'variant-xyz';
      const mockUpdatedCart = { userId: mockUserId, items: [] };
      mockCartsService.removeItemFromCart.mockResolvedValue(mockUpdatedCart);

      const result = await controller.removeItem(
        mockReq as AuthenticatedRequest,
        mockProductId,
        mockVariantId,
      );

      expect(mockCartsService.removeItemFromCart).toHaveBeenCalledWith(
        mockUserId,
        mockProductId,
        mockVariantId,
      );
      expect(result).toEqual(mockUpdatedCart);
    });
  });

  describe('updateQuantity', () => {
    it('should call cartsService.updateItemQuantity with correct params', async () => {
      const mockUserId = 'user-123';
      const mockReq = { user: { userId: mockUserId } };
      const mockProductId = 'product-abc';
      const mockVariantId = 'variant-xyz';
      const mockQuantity = 5;
      const mockUpdatedCart = {
        userId: mockUserId,
        items: [
          {
            productId: mockProductId,
            variantId: mockVariantId,
            quantity: mockQuantity,
          },
        ],
      };
      mockCartsService.updateItemQuantity.mockResolvedValue(mockUpdatedCart);

      const result = await controller.updateQuantity(
        mockReq as AuthenticatedRequest,
        mockProductId,
        mockVariantId,
        mockQuantity,
      );

      expect(mockCartsService.updateItemQuantity).toHaveBeenCalledWith(
        mockUserId,
        mockProductId,
        mockVariantId,
        mockQuantity,
      );
      expect(result).toEqual(mockUpdatedCart);
    });

    it('should call removeItemFromCart if quantity is 0', async () => {
      const mockUserId = 'user-123';
      const mockReq = { user: { userId: mockUserId } };
      const mockProductId = 'product-abc';
      const mockVariantId = 'variant-xyz';
      const mockQuantity = 0;
      mockCartsService.removeItemFromCart.mockResolvedValue({});

      await controller.updateQuantity(
        mockReq as AuthenticatedRequest,
        mockProductId,
        mockVariantId,
        mockQuantity,
      );

      expect(mockCartsService.removeItemFromCart).toHaveBeenCalledWith(
        mockUserId,
        mockProductId,
        mockVariantId,
      );
    });
  });

  describe('clearCart', () => {
    it('should call cartsService.clearCart with the correct userId', async () => {
      const mockUserId = 'user-123';
      const mockReq = { user: { userId: mockUserId } };
      mockCartsService.clearCart.mockResolvedValue(undefined);

      const result = await controller.clearCart(mockReq as AuthenticatedRequest);

      expect(mockCartsService.clearCart).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual({ message: 'Cart has been cleared.' });
    });
  });
});
