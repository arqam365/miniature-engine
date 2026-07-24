import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { GuardiansService } from './guardians.service';
import { CreateGuardianDto } from './dto/create-guardian.dto';
import { LinkGuardianDto } from './dto/link-guardian.dto';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('guardians')
@ApiBearerAuth('access-token')
@Controller('guardians')
export class GuardiansController {
  constructor(private readonly guardiansService: GuardiansService) {}

  @Get()
  @RequirePermission('students:read')
  @ApiOperation({ summary: 'List guardians (paginated, searchable)' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  findAll(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.guardiansService.findAll({ search, page: Number(page), pageSize: Number(pageSize) });
  }

  @Get('sponsors')
  @RequirePermission('students:read')
  @ApiOperation({ summary: 'List sponsors (paginated, searchable)' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  findSponsors(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.guardiansService.findSponsors({ search, page: Number(page), pageSize: Number(pageSize) });
  }

  @Post()
  @RequirePermission('students:write')
  @ApiOperation({ summary: 'Create a new guardian' })
  create(@Body() dto: CreateGuardianDto) {
    return this.guardiansService.create(dto);
  }

  @Post('/students/:studentId/link')
  @RequirePermission('students:write')
  @ApiOperation({ summary: 'Link guardian to a student' })
  linkToStudent(
    @Param('studentId') studentId: string,
    @Body() dto: LinkGuardianDto,
    @CurrentUser('instituteId') instituteId: string,
  ) {
    return this.guardiansService.linkToStudent(studentId, dto, instituteId);
  }

  @Get(':id')
  @RequirePermission('students:read')
  @ApiOperation({ summary: 'Get guardian profile with linked students' })
  findById(@Param('id') id: string) {
    return this.guardiansService.findById(id);
  }
}
