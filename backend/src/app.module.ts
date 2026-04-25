import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './users/user.entity'; 
import { UsersModule } from './users/users.module';
import { SensorsGateway } from './sensors.gateway'; // 1. Gateway import edildi

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost', 
      port: 5432,
      username: 'enes_admin',
      password: 'studylounge_secret',
      database: 'studylounge',
      entities: [User],
      synchronize: true, 
    }),
    UsersModule,
  ],
  controllers: [],
  providers: [SensorsGateway], // 2. Gateway buraya eklendi
})
export class AppModule {}