import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GuardiansService } from './guardians.service';
import { CreateGuardianDto } from './dto/create-guardian.dto';
import { LinkGuardianDto } from './dto/link-guardian.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('guardians')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('guardians')
export class GuardiansController {
  constructor(private readonly guardiansService: GuardiansService) {}

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
