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

  @Get('vouchers')
  @RequirePermission('accounts:read')
  @ApiOperation({ summary: 'List vouchers' })
  getVouchers(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.accountsService.getVouchers(Number(page) || 1, Number(limit) || 20);
  }

  @Post('vouchers')
  @RequirePermission('accounts:create')
  @ApiOperation({ summary: 'Create a voucher entry' })
  createVoucher(@Body() dto: CreateVoucherDto, @Request() req: any) {
    return this.accountsService.createVoucher(dto, req.user?.id);
  }

  @Get('collection')
  @RequirePermission('accounts:read')
  @ApiOperation({ summary: 'Fee collection summary grouped by payment mode' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getCollection(@Query('from') from?: string, @Query('to') to?: string) {
    const now = new Date().toISOString().slice(0, 10);
    const startOfMonth = now.slice(0, 8) + '01';
    return this.accountsService.getCollection(from ?? startOfMonth, to ?? now);
  }

  @Get('cash-in-hand')
  @RequirePermission('accounts:read')
  @ApiOperation({ summary: 'Cash in hand for all asset accounts' })
  getCashInHand() {
    return this.accountsService.getCashInHand();
  }

  @Get('trial-balance')
  @RequirePermission('accounts:read')
  @ApiOperation({ summary: 'Trial balance as of a date' })
  @ApiQuery({ name: 'asOf', required: false })
  getTrialBalance(@Query('asOf') asOf?: string) {
    const target = asOf ?? new Date().toISOString().slice(0, 10);
    return this.accountsService.getTrialBalance(target);
  }

  @Get('receipts')
  @RequirePermission('accounts:read')
  @ApiOperation({ summary: 'Fee receipts with pagination and search' })
  getReceipts(
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.accountsService.getReceipts({ search, from, to, page: Number(page), pageSize: Number(pageSize) });
  }

  @Get('vendors')
  @RequirePermission('accounts:read')
  @ApiOperation({ summary: 'List vendors' })
  getVendors() {
    return this.accountsService.getVendors();
  }

  @Post('vendors')
  @RequirePermission('accounts:create')
  @ApiOperation({ summary: 'Create a vendor' })
  createVendor(@Body() dto: { name: string; phone?: string; email?: string; address?: string }) {
    return this.accountsService.createVendor(dto);
  }

  @Post('seed-defaults')
  @RequirePermission('accounts:create')
  @ApiOperation({ summary: 'Seed default chart of accounts for the institute' })
  seedDefaultAccounts() {
    return this.accountsService.seedDefaultAccounts();
  }
}
