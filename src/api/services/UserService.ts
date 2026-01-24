import { AppDataSource } from '../../data-source';
import { User } from '../entities/User';
import { AppError } from '../middlewares/errorHandler';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export class UserService {
    private userRepository = AppDataSource.getRepository(User);

    async register(email: string, password: string) {
        const existingUser = await this.userRepository.findOneBy({ email });
        if (existingUser) {
            throw new AppError('User already exists', 400);
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = this.userRepository.create({
            email,
            password_hash: passwordHash,
        });

        await this.userRepository.save(user);

        // Return user without password
        const { password_hash, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    async login(email: string, password: string) {
        const user = await this.userRepository.findOneBy({ email });
        if (!user) {
            throw new AppError('Invalid email or password', 401);
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            throw new AppError('Invalid email or password', 401);
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET || 'default_secret',
            { expiresIn: '1d' }
        );

        const { password_hash, ...userWithoutPassword } = user;

        return { user: userWithoutPassword, token };
    }
}
