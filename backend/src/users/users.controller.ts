import { Controller, Post, Get, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // POST localhost:3000/users/register
  @Post('register')
  async register(@Body() userData: Partial<User>) {
    return this.usersService.create(userData);
  }

  // GET localhost:3000/users
  @Get()
  async getAllUsers() {
    return this.usersService.findAll();
  }
}