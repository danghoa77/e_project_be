// libs/common-auth/src/auth-providers/google-auth.service.ts
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library'; // Để xác minh ID token

@Injectable()
export class GoogleAuthService {
    private readonly logger = new Logger(GoogleAuthService.name);
    private readonly client: OAuth2Client;

    constructor() {
        // Khởi tạo OAuth2Client nếu bạn cần xác minh ID token thủ công
        // Hoặc nếu bạn muốn sử dụng nó để trao đổi code lấy token (thay vì passport-google-oauth20)
        // Đối với việc xác minh ID token sau này:
        this.client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    }

    /**
     * Xác minh Google ID Token (thường được gửi từ frontend).
     * @param idToken Google ID Token.
     * @returns Thông tin payload đã xác minh từ token.
     */
    async verifyGoogleIdToken(idToken: string): Promise<any> {
        try {
            const ticket = await this.client.verifyIdToken({
                idToken,
                audience: process.env.GOOGLE_CLIENT_ID, // Đảm bảo audience khớp với Client ID của bạn
            });
            const payload = ticket.getPayload();
            if (!payload) {
                this.logger.error('Google ID Token verification failed: payload is undefined');
                throw new InternalServerErrorException('Failed to verify Google ID Token.');
            }
            this.logger.log(`Google ID Token verified for user: ${payload.email}`);
            return payload;
        } catch (error) {
            this.logger.error(`Failed to verify Google ID Token: ${error.message}`);
            throw new InternalServerErrorException('Failed to verify Google ID Token.');
        }
    }

    // Bạn có thể thêm các phương thức khác ở đây nếu cần tương tác trực tiếp với Google API,
    // ví dụ: để làm mới token hoặc truy cập các dịch vụ Google khác.
}