import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async createCompany(data: { name: string; type?: string }) {
    return this.prisma.client.company.create({ data: { name: data.name } });
  }

  async findAllCompanies() {
    return this.prisma.client.company.findMany();
  }

  async findCompanyById(id: string) {
    const company = await this.prisma.client.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }
}
