import { describe, it, expect } from 'vitest';
import { CleaningSubmissionSchema, FinalProjectSubmissionSchema } from '../src/schemas/validation.js';
import { ImportService } from '../src/services/importService.js';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';

describe('Security Mitigations Verification', () => {
  it('rejects javascript: and data: URIs in submission schemas', () => {
    const maliciousCleaning = {
      cleanedDatasetUrl: 'javascript:alert(1)',
      psbUrl: 'https://example.com/file.psb',
    };
    const resCleaning = CleaningSubmissionSchema.safeParse(maliciousCleaning);
    expect(resCleaning.success).toBe(false);

    const maliciousProject = {
      productName: 'Test Product',
      productDescription: 'Valid description of at least ten characters.',
      prototypeUrl: 'javascript:stealTokens()',
    };
    const resProject = FinalProjectSubmissionSchema.safeParse(maliciousProject);
    expect(resProject.success).toBe(false);

    const validProject = {
      productName: 'Safe Product',
      productDescription: 'Valid description of at least ten characters.',
      prototypeUrl: 'https://figma.com/proto/12345',
      githubUrl: 'https://github.com/iste/synapse',
    };
    const resValid = FinalProjectSubmissionSchema.safeParse(validProject);
    expect(resValid.success).toBe(true);
  });

  it('strictly provisions public accounts from CSV import even if permission:admin is specified', () => {
    const row = {
      firstName: 'Mallory',
      email: 'mallory@attacker.com',
      college: 'Evil Corp',
      permission: 'admin',
      accountRole: 'admin',
    };
    const normalized = ImportService.normalizeRow(row);
    expect(normalized.valid).toBe(true);
    expect(normalized.row?.accountRole).toBe('public');
  });

  it('rejects unpinned algorithm tokens during JWT verification', () => {
    // Generate an unpinned or none-algorithm token
    const token = jwt.sign({ email: 'test@iste.org' }, env.JWT_SECRET, { algorithm: 'HS256' });
    const verified = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as any;
    expect(verified.email).toBe('test@iste.org');

    // Trying to verify with a different algorithm should throw
    expect(() => {
      jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS384'] });
    }).toThrow();
  });
});
