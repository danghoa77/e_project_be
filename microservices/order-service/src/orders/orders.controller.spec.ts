import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { NotFoundException } from '@nestjs/common';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { Order } from '../schemas/order.schema';
import { HttpService } from '@nestjs/axios';
import { RedisService } from '@app/common-auth';
import { CartsService } from '../carts/carts.service';
import { Connection } from 'mongoose';

interface AuthenticatedRequest {
  user: { userId: string; role: 'customer' | 'admin' };
}

const mockOrderModel = {
  find: jest.fn().mockReturnThis(),
  findById: jest.fn().mockReturnThis(),
  exec: jest.fn(),
  save: jest.fn(),
};

const mockCartsService = {
  getCartByUserId: jest.fn(),
  clearCart: jest.fn(),
};

const mockHttpService = {
  get: jest.fn(),
  patch: jest.fn(),
};

const mockRedisService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

const mockConnection = {
  startSession: jest.fn().mockReturnThis(),
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  abortTransaction: jest.fn(),
  endSession: jest.fn(),
};

describe('OrdersController', () => {
  let controller: OrdersController;
  let ordersService: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        OrdersService,
        { provide: getModelToken(Order.name), useValue: mockOrderModel },
        { provide: CartsService, useValue: mockCartsService },
        { provide: HttpService, useValue: mockHttpService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: getConnectionToken(), useValue: mockConnection },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    ordersService = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();

    jest.spyOn(ordersService, 'createOrder');
    jest.spyOn(ordersService, 'findAllOrders');
    jest.spyOn(ordersService, 'findOrdersByUserId');
    jest.spyOn(ordersService, 'findOrderById');
    jest.spyOn(ordersService, 'updateOrderStatus');
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createOrder', () => {
    it('should call service.createOrder with userId and DTO', async () => {
      const mockUserId = 'user-123';
      const mockReq = { user: { userId: mockUserId } };
      const mockCreateDto: CreateOrderDto = {
        shippingAddress: {
          street: '123 Test Street',
          city: 'Test City',
        },
        items: [
          {
            productId: 'product-abc',
            variantId: 'variant-xyz-1',
            quantity: 1,
            price: 50.0,
          },
          {
            productId: 'product-def',
            variantId: 'variant-xyz-2',
            quantity: 2,
            price: 50.0,
          },
        ],
      };

      (ordersService.createOrder as jest.Mock).mockResolvedValue({
        _id: 'new-order-id-456',
        status: 'pending',
        ...mockCreateDto,
      });

      await controller.createOrder(mockReq as any, mockCreateDto);

      expect(ordersService.createOrder).toHaveBeenCalledWith(
        mockUserId,
        mockCreateDto,
      );
    });
  });

  describe('getOrders', () => {
    it('should call findAllOrders for an admin user', async () => {
      const mockReq = { user: { role: 'admin' } };
      (ordersService.findAllOrders as jest.Mock).mockResolvedValue([]);
      await controller.getOrders(mockReq as any);
      expect(ordersService.findAllOrders).toHaveBeenCalled();
      expect(ordersService.findOrdersByUserId).not.toHaveBeenCalled();
    });

    it('should call findOrdersByUserId for a customer', async () => {
      const mockReq = { user: { userId: 'customer-123', role: 'customer' } };
      (ordersService.findOrdersByUserId as jest.Mock).mockResolvedValue([]);
      await controller.getOrders(mockReq as any);
      expect(ordersService.findOrdersByUserId).toHaveBeenCalledWith(
        'customer-123',
      );
      expect(ordersService.findAllOrders).not.toHaveBeenCalled();
    });
  });

  describe('getOrderById', () => {
    it('should allow an admin to get any order', async () => {
      const mockReq = { user: { role: 'admin' } };
      const mockOrder = {
        userId: {
          toHexString: () => 'another-user-id',
        },
      };
      (ordersService.findOrderById as jest.Mock).mockResolvedValue(mockOrder);

      const result = await controller.getOrderById(
        mockReq as any,
        'some-order-id',
      );

      expect(ordersService.findOrderById).toHaveBeenCalledWith('some-order-id');
      expect(result).toEqual(mockOrder);
    });

    it('should allow a customer to get their own order', async () => {
      const mockUserId = 'customer-123';
      const mockReq = { user: { userId: mockUserId, role: 'customer' } };
      const mockOrder = {
        userId: {
          toHexString: () => mockUserId,
        },
      };
      (ordersService.findOrderById as jest.Mock).mockResolvedValue(mockOrder);

      const result = await controller.getOrderById(
        mockReq as any,
        'my-order-id',
      );

      expect(ordersService.findOrderById).toHaveBeenCalledWith('my-order-id');
      expect(result).toEqual(mockOrder);
    });

    it("should throw NotFoundException when a customer tries to get another user's order", async () => {
      const mockUserId = 'customer-123';
      const anotherUserId = 'customer-456';
      const mockReq = { user: { userId: mockUserId, role: 'customer' } };
      const mockOrder = {
        userId: {
          toHexString: () => anotherUserId,
        },
      };
      (ordersService.findOrderById as jest.Mock).mockResolvedValue(mockOrder);

      await expect(
        controller.getOrderById(mockReq as any, 'another-order-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateOrderStatus', () => {
    it('should call service.updateOrderStatus with correct params for a valid status', async () => {
      const mockOrderId = 'order-123';
      const mockUpdateDto: UpdateOrderStatusDto = { status: 'shipped' };
      (ordersService.updateOrderStatus as jest.Mock).mockResolvedValue({});

      await controller.updateOrderStatus(mockOrderId, mockUpdateDto);

      expect(ordersService.updateOrderStatus).toHaveBeenCalledWith(
        mockOrderId,
        'shipped',
      );
    });

    it('should throw an exception for an invalid status', async () => {
      const mockOrderId = 'order-123';
      const mockUpdateDto: any = { status: 'invalid_status' };

      await expect(
        controller.updateOrderStatus(mockOrderId, mockUpdateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
