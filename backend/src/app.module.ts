import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './users/user.entity'; // Birazdan oluşturacağız

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost', // Docker portu yerel bilgisayara (5432) eşledi
      port: 5432,
      username: 'enes_admin',
      password: 'studylounge_secret',
      database: 'studylounge',
      entities: [User],
      synchronize: true, // Geliştirme aşamasında tabloları otomatik oluşturur
    }),
  ],
})
export class AppModule {}