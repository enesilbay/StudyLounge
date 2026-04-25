import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './user.entity';

@Module({
  // Buradaki forFeature([User]) kısmı NestJS'e "Bu modül User tablosunu kullanacak" der.
  imports: [TypeOrmModule.forFeature([User])], 
  providers: [UsersService],
  controllers: [UsersController],
  // Diğer modüllerin (örneğin Auth) bu servise erişebilmesi için dışarı açıyoruz.
  exports: [UsersService], 
})
export class UsersModule {}