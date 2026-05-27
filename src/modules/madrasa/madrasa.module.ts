import { Module } from '@nestjs/common';
import { MadrasaService } from './madrasa.service';
import { MadrasaController } from './madrasa.controller';

@Module({
  controllers: [MadrasaController],
  providers: [MadrasaService],
  exports: [MadrasaService],
})
export class MadrasaModule {}
