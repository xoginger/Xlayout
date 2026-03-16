import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyType } from '@prisma/client';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async createCompany(data: { name: string; type: CompanyType }) {
    return this.prisma.company.create({ data });
  }

  async findAllCompanies() {
    return this.prisma.company.findMany();
  }

  async findCompanyById(id: string) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }
}
