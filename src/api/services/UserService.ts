import { AppDataSource } from '../../data-source';
import { User } from '../entities/User';
import { AppError } from '../middlewares/errorHandler';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export class UserService {
    private userRepository = AppDataSource.getRepository(User);

    /**
     * Registra um novo usuário com senha criptografada.
     */
    async register(email: string, password: string) {
        const existingUser = await this.userRepository.findOneBy({ email });
        if (existingUser) {
            throw new AppError('Usuário já existe', 400);
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

    /**
     * Autentica um usuário e gera um token JWT.
     */
    async login(email: string, password: string) {
        const user = await this.userRepository.findOneBy({ email });
        if (!user) {
            throw new AppError('Email ou senha inválidos', 401);
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            throw new AppError('Email ou senha inválidos', 401);
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
