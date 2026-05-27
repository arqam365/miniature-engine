import { Body, Controller, Get, Param, Post, Query, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('accounts')
@ApiBearerAuth('access-token')
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get('chart-of-accounts')
  @RequirePermission('accounts:read')
  @ApiOperation({ summary: 'List all active accounts (chart of accounts)' })
  chartOfAccounts() {
    return this.accountsService.chartOfAccounts();
  }

  @Get('day-book')
  @RequirePermission('accounts:read')
  @ApiOperation({ summary: 'Day book — all ledger entries for a date' })
  @ApiQuery({ name: 'date', required: false, example: '2026-05-26' })
  dayBook(@Query('date') date?: string) {
    const target = date ?? new Date().toISOString().slice(0, 10);
    return this.accountsService.dayBook(target);
  }

  @Get('ledger/:accountId')
  @RequirePermission('accounts:read')
  @ApiOperation({ summary: 'Ledger entries for a specific account with running balance' })
  ledger(@Param('accountId') accountId: string) {
    return this.accountsService.ledger(accountId);
  }

  @Post('vouchers')
  @RequirePermission('accounts:create')
  @ApiOperation({ summary: 'Create a voucher entry' })
  createVoucher(@Body() dto: CreateVoucherDto, @Request() req: any) {
    return this.accountsService.createVoucher(dto, req.user?.sub);
  }
}
