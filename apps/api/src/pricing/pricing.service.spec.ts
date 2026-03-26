import { Test, TestingModule } from '@nestjs/testing';
import { PricingEngineService } from './pricing.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PricingEngineService', () => {
  let service: PricingEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PricingEngineService],
    }).compile();

    service = module.get<PricingEngineService>(PricingEngineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
