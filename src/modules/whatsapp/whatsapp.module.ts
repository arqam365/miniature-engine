import { Module } from '@nestjs/common';
import { RevengageWhatsappService } from './revengage-whatsapp.service';

@Module({
  providers: [RevengageWhatsappService],
  exports: [RevengageWhatsappService],
})
export class WhatsappModule {}
