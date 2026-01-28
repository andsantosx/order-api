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
    async register(name: string, email: string, password: string) {
        const existingUser = await this.userRepository.findOneBy({ email });
        if (existingUser) {
            throw new AppError('Usuário já existe', 400);
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = this.userRepository.create({
            name,
            email,
            password_hash: passwordHash,
            isAdmin: false // Explicit default
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
            { userId: user.id, email: user.email, isAdmin: user.isAdmin },
            process.env.JWT_SECRET || 'default_secret',
            { expiresIn: '1d' }
        );

        const { password_hash, ...userWithoutPassword } = user;

        return { user: userWithoutPassword, token };
    }

    /**
     * Busca o perfil do usuário logado.
     */
    async getProfile(userId: string) {
        const user = await this.userRepository.findOneBy({ id: userId });
        if (!user) {
            throw new AppError('Usuário não encontrado', 404);
        }
        const { password_hash, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    /**
     * Atualiza o perfil do usuário.
     */
    async updateProfile(userId: string, data: { name?: string; email?: string; password?: string }) {
        const user = await this.userRepository.findOneBy({ id: userId });
        if (!user) {
            throw new AppError('Usuário não encontrado', 404);
        }

        if (data.name) user.name = data.name;
        if (data.email) {
            // Check if email is already taken by another user
            const existingUser = await this.userRepository.findOneBy({ email: data.email });
            if (existingUser && existingUser.id !== userId) {
                throw new AppError('Email já está em uso', 400);
            }
            user.email = data.email;
        }
        if (data.password) {
            user.password_hash = await bcrypt.hash(data.password, 10);
        }

        await this.userRepository.save(user);

        const { password_hash, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
}
