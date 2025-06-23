import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Response, Request } from 'express';

// 1. Mock PaymentsService
const mockPaymentsService = {
    createVnpayPaymentUrl: jest.fn(),
    // Thêm các hàm khác nếu controller của bạn có gọi
};

describe('PaymentsController', () => {
    let controller: PaymentsController;
    let service: PaymentsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [PaymentsController],
            providers: [
                {
                    provide: PaymentsService,
                    useValue: mockPaymentsService,
                },
            ],
        }).compile();

        controller = module.get<PaymentsController>(PaymentsController);
        service = module.get<PaymentsService>(PaymentsService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    // Test cho endpoint POST /create-vnpay-payment
    describe('createVnpayPayment', () => {
        it('should call service and redirect with the returned URL', () => {
            // Arrange (Chuẩn bị)

            // Tạo một mock request object chứa các thuộc tính mà hàm của bạn sử dụng
            const mockReq = {
                headers: { 'x-forwarded-for': '123.123.123.123' },
                socket: { remoteAddress: 'fallback-ip' },
            } as unknown as Request; // Ép kiểu để TypeScript chấp nhận

            // Tạo một mock response object với hàm redirect giả lập
            const mockRes = {
                redirect: jest.fn(), // jest.fn() tạo ra một hàm giả để chúng ta có thể theo dõi
            } as unknown as Response;

            // Dữ liệu body giả
            const mockBody = {
                amount: 50000,
                bankCode: 'NCB',
            };

            // Giả lập service trả về một URL
            const mockPaymentUrl = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_...';
            mockPaymentsService.createVnpayPaymentUrl.mockReturnValue(mockPaymentUrl);

            // Act (Hành động): Gọi hàm controller
            controller.createVnpayPayment(mockReq as any, mockRes as any, mockBody);

            // Assert (Kiểm chứng)

            // 1. Kiểm tra xem service có được gọi với đúng các tham số không
            expect(service.createVnpayPaymentUrl).toHaveBeenCalledWith(
                '123.123.123.123', // ipAddr từ header
                50000,             // amount từ body
                'NCB',             // bankCode từ body
                'vn',              // language mặc định
                'Thanh toan don hang' // orderInfo mặc định
            );

            // 2. Kiểm tra xem hàm res.redirect có được gọi với đúng URL mà service trả về không
            expect(mockRes.redirect).toHaveBeenCalledWith(mockPaymentUrl);
        });
    });
});