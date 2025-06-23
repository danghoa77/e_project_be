import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';

const mockOrdersService = {
    createOrder: jest.fn(),
    findAllOrders: jest.fn(),
    findOrdersByUserId: jest.fn(),
    findOrderById: jest.fn(),
    updateOrderStatus: jest.fn(),
};

describe('OrdersController', () => {
    let controller: OrdersController;
    let service: OrdersService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [OrdersController],
            providers: [
                {
                    provide: OrdersService,
                    useValue: mockOrdersService,
                },
            ],
        }).compile();

        controller = module.get<OrdersController>(OrdersController);
        service = module.get<OrdersService>(OrdersService);
        jest.clearAllMocks();
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
                    },
                    {
                        productId: 'product-def',
                        variantId: 'variant-xyz-2',
                        quantity: 2,
                    },
                ],
            };

            mockOrdersService.createOrder.mockResolvedValue({
                _id: 'new-order-id-456',
                status: 'pending',
                ...mockCreateDto
            });

            await controller.createOrder(mockReq, mockCreateDto);

            expect(service.createOrder).toHaveBeenCalledWith(mockUserId, mockCreateDto);
        });
    });

    describe('getOrders', () => {
        it('should call findAllOrders for an admin user', async () => {
            const mockReq = { user: { role: 'admin' } };
            await controller.getOrders(mockReq);
            expect(service.findAllOrders).toHaveBeenCalled();
            expect(service.findOrdersByUserId).not.toHaveBeenCalled();
        });

        it('should call findOrdersByUserId for a customer', async () => {
            const mockReq = { user: { userId: 'customer-123', role: 'customer' } };
            await controller.getOrders(mockReq);
            expect(service.findOrdersByUserId).toHaveBeenCalledWith('customer-123');
            expect(service.findAllOrders).not.toHaveBeenCalled();
        });
    });

    describe('getOrderById', () => {
        it('should allow an admin to get any order', async () => {
            const mockReq = { user: { role: 'admin' } };
            const mockOrder = {
                userId: {
                    toString: () => 'another-user-id'
                }
            };
            mockOrdersService.findOrderById.mockResolvedValue(mockOrder);

            const result = await controller.getOrderById(mockReq, 'some-order-id');

            expect(service.findOrderById).toHaveBeenCalledWith('some-order-id');
            expect(result).toEqual(mockOrder);
        });

        it('should allow a customer to get their own order', async () => {
            const mockUserId = 'customer-123';
            const mockReq = { user: { userId: mockUserId, role: 'customer' } };
            const mockOrder = {
                userId: {
                    toString: () => mockUserId,
                },
            };
            mockOrdersService.findOrderById.mockResolvedValue(mockOrder);

            const result = await controller.getOrderById(mockReq, 'my-order-id');

            expect(service.findOrderById).toHaveBeenCalledWith('my-order-id');
            expect(result).toEqual(mockOrder);
        });

        it('should throw ForbiddenException when a customer tries to get another user\'s order', async () => {
            const mockUserId = 'customer-123';
            const anotherUserId = 'customer-456';
            const mockReq = { user: { userId: mockUserId, role: 'customer' } };
            const mockOrder = {
                userId: {
                    toString: () => anotherUserId
                }
            };
            mockOrdersService.findOrderById.mockResolvedValue(mockOrder);

            await expect(controller.getOrderById(mockReq, 'another-order-id')).rejects.toThrow(NotFoundException);
        });
    });

    describe('updateOrderStatus', () => {
        it('should call service.updateOrderStatus with correct params for a valid status', async () => {
            const mockOrderId = 'order-123';
            const mockUpdateDto: UpdateOrderStatusDto = { status: 'shipped' };
            mockOrdersService.updateOrderStatus.mockResolvedValue({});

            await controller.updateOrderStatus(mockOrderId, mockUpdateDto);

            expect(service.updateOrderStatus).toHaveBeenCalledWith(mockOrderId, 'shipped');
        });

        it('should throw an exception for an invalid status', async () => {
            const mockOrderId = 'order-123';
            const mockUpdateDto: any = { status: 'invalid_status' };

            await expect(controller.updateOrderStatus(mockOrderId, mockUpdateDto)).rejects.toThrow(NotFoundException);
        });
    });
});
