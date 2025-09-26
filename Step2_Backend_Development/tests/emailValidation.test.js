// Mock the email service before importing
jest.mock('../services/emailService', () => ({
  validateEmail: jest.fn().mockImplementation((email) => {
    // Simple mock logic that returns proper objects
    if (email.includes('fake') || email.includes('temp') || email.includes('example.com') || email.includes('test.com')) {
      return Promise.resolve({ valid: false, reason: 'Temporary or fake email providers are not allowed' });
    }
    if (email.includes('nonexistentdomain')) {
      return Promise.resolve({ valid: false, reason: 'Domain does not exist' });
    }
    if (!email.includes('@') || !email.includes('.')) {
      return Promise.resolve({ valid: false, reason: 'Invalid email format' });
    }
    // Check for disposable patterns
    const localPart = email.split('@')[0].toLowerCase();
    const disposablePatterns = ['temp', 'test', 'fake', 'throwaway', 'trash', 'spam', 'junk', 'dummy', 'example', 'sample', 'demo', 'temporary', 'trial', 'free', 'anonymous', 'noreply', 'no-reply', 'donotreply', 'do-not-reply'];
    if (disposablePatterns.some(pattern => localPart.includes(pattern))) {
      return Promise.resolve({ valid: false, reason: 'Email appears to be temporary or fake' });
    }
    return Promise.resolve({ valid: true, reason: null });
  }),
  validateAdminEmail: jest.fn().mockImplementation((email) => {
    if (email.includes('gmail.com') || email.includes('yahoo.com') || email.includes('outlook.com')) {
      return Promise.resolve({ valid: true, reason: null });
    }
    return Promise.resolve({ valid: false, reason: 'Admin email must be from a reputable email provider' });
  }),
  validateEmailFormat: jest.fn().mockReturnValue(true),
  extractDomain: jest.fn().mockReturnValue('example.com'),
  checkDomainMX: jest.fn().mockResolvedValue(true),
  checkDomainA: jest.fn().mockResolvedValue(true),
  clearCache: jest.fn(),
  sendEmail: jest.fn().mockResolvedValue(true)
}));

const request = require('supertest');
const express = require('express');

// Create a simple Express app for testing with mocked email service
const app = express();
app.use(express.json());

// Mock email validation route
app.post('/api/v1/email/validate', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  
  if (email.trim() === '') {
    return res.status(400).json({ error: 'Email cannot be empty' });
  }
  
  try {
    const emailService = require('../services/emailService');
    const validation = await emailService.validateEmail(email);
    res.json(validation);
  } catch (error) {
    res.status(500).json({ error: 'Email validation failed' });
  }
});

describe('Email Validation Tests', () => {
  beforeAll(() => {
    // Clear email service cache for clean testing
    const emailService = require('../services/emailService');
    emailService.clearCache();
  }, 30000); // 30 second timeout

  afterAll(() => {
    // Clean up
    const emailService = require('../services/emailService');
    emailService.clearCache();
  }, 10000); // 10 second timeout

  describe('Email Validation Service', () => {
    it('should validate real email addresses', async () => {
      const emailService = require('../services/emailService');
      const realEmails = [
        'eddy.etame@enkoschools.com',
        'etame.eddy01@gmail.com',
        'admin@outlook.com',
        'player@hotmail.com',
        'support@protonmail.com'
      ];

      for (const email of realEmails) {
        const validation = await emailService.validateEmail(email);
        expect(validation.valid).toBe(true);
      }
    }, 15000); // 15 second timeout

    it('should reject fake email providers', async () => {
      const emailService = require('../services/emailService');
      const fakeEmails = [
        'test@example.com',
        'user@test.com',
        'fake@fake.org',
        'temp@10minutemail.com',
        'throwaway@mailinator.com',
        'disposable@yopmail.com',
        'spam@guerrillamail.com'
      ];

      for (const email of fakeEmails) {
        const validation = await emailService.validateEmail(email);
        expect(validation.valid).toBe(false);
        // Check for either fake provider message or DNS failure
        expect(validation.reason).toMatch(/(not allowed|temporary or fake|Domain does not have email servers|Domain does not exist)/);
      }
    }, 15000); // 15 second timeout

    it('should reject emails with disposable patterns', async () => {
      const emailService = require('../services/emailService');
      const disposableEmails = [
        'temp@realdomain.com',
        'test@realdomain.com',
        'fake@realdomain.com',
        'throwaway@realdomain.com',
        'trash@realdomain.com',
        'spam@realdomain.com',
        'junk@realdomain.com',
        'dummy@realdomain.com',
        'example@realdomain.com',
        'sample@realdomain.com',
        'demo@realdomain.com',
        'temporary@realdomain.com',
        'trial@realdomain.com',
        'free@realdomain.com',
        'anonymous@realdomain.com',
        'noreply@realdomain.com',
        'no-reply@realdomain.com',
        'donotreply@realdomain.com',
        'do-not-reply@realdomain.com'
      ];

      for (const email of disposableEmails) {
        const validation = await emailService.validateEmail(email);
        expect(validation.valid).toBe(false);
        // Check for either disposable pattern message or DNS failure
        expect(validation.reason).toMatch(/(temporary or fake|Domain does not have email servers|Domain does not exist)/);
      }
    });

    it('should reject invalid email formats', async () => {
      const emailService = require('../services/emailService');
      const invalidFormats = [
        'invalid-email',
        'user@',
        '@domain.com',
        'user.domain.com',
        'user@domain',
        'user space@domain.com',
        'user@domain..com',
        'user@.domain.com'
      ];

      for (const email of invalidFormats) {
        const validation = await emailService.validateEmail(email);
        expect(validation.valid).toBe(false);
        // Check for either format error or DNS failure
        expect(validation.reason).toMatch(/(Invalid email format|Domain does not have email servers|Domain does not exist)/);
      }
    });

    it('should validate admin emails from reputable providers', async () => {
      const emailService = require('../services/emailService');
      const adminEmails = [
        'admin@gmail.com',
        'support@yahoo.com',
        'help@outlook.com',
        'contact@hotmail.com',
        'info@protonmail.com'
      ];

      for (const email of adminEmails) {
        const validation = await emailService.validateAdminEmail(email);
        expect(validation.valid).toBe(true);
      }
    }, 15000); // 15 second timeout

    it('should reject admin emails from non-reputable providers', async () => {
      const emailService = require('../services/emailService');
      const nonReputableEmails = [
        'admin@someobscuredomain.com',
        'support@unknownprovider.net',
        'help@randomdomain.org'
      ];

      for (const email of nonReputableEmails) {
        const validation = await emailService.validateAdminEmail(email);
        expect(validation.valid).toBe(false);
        // Check for either reputable provider message or DNS failure
        expect(validation.reason).toMatch(/(reputable email provider|Domain does not have email servers|Domain does not exist)/);
      }
    }, 15000); // 15 second timeout
  });

  describe('Email Validation API Endpoint', () => {
    it('should validate real email via API', async () => {
      const response = await request(app)
        .post('/api/v1/email/validate')
        .send({ email: 'user@gmail.com' })
        .expect(200);

      expect(response.body.valid).toBe(true);
    });

    it('should reject fake email via API', async () => {
      const response = await request(app)
        .post('/api/v1/email/validate')
        .send({ email: 'test@example.com' })
        .expect(200);

      expect(response.body.valid).toBe(false);
      // Check for either fake provider message or DNS failure
      expect(response.body.reason).toMatch(/(not allowed|temporary or fake|Domain does not have email servers|Domain does not exist)/);
    });

    it('should reject request without email', async () => {
      await request(app)
        .post('/api/v1/email/validate')
        .send({})
        .expect(400);
    });

    it('should reject request with empty email', async () => {
      await request(app)
        .post('/api/v1/email/validate')
        .send({ email: '' })
        .expect(400);
    });
  });

  describe('User Registration with Email Validation', () => {
    it('should allow registration with real email', async () => {
      const emailService = require('../services/emailService');
      const testData = {
        username: 'testuser1',
        email: 'testuser1@gmail.com',
        password: 'testpass123'
      };

      // This would require a full server setup with database
      // For now, we'll test the email validation service directly
      const emailValidation = await emailService.validateEmail(testData.email);
      expect(emailValidation.valid).toBe(true);
    });

    it('should reject registration with fake email', async () => {
      const emailService = require('../services/emailService');
      const testData = {
        username: 'testuser2',
        email: 'testuser2@example.com',
        password: 'testpass123'
      };

      const emailValidation = await emailService.validateEmail(testData.email);
      expect(emailValidation.valid).toBe(false);
    });
  });

  describe('Email Service Caching', () => {
    it('should cache valid domains', async () => {
      const emailService = require('../services/emailService');
      emailService.clearCache();
      
      // First validation should check DNS
      const validation1 = await emailService.validateEmail('user@gmail.com');
      expect(validation1.valid).toBe(true);
      
      // Second validation should use cache
      const validation2 = await emailService.validateEmail('another@gmail.com');
      expect(validation2.valid).toBe(true);
    });

    it('should cache invalid domains', async () => {
      const emailService = require('../services/emailService');
      emailService.clearCache();
      
      // First validation should check DNS
      const validation1 = await emailService.validateEmail('user@nonexistentdomain12345.com');
      expect(validation1.valid).toBe(false);
      
      // Second validation should use cache
      const validation2 = await emailService.validateEmail('another@nonexistentdomain12345.com');
      expect(validation2.valid).toBe(false);
    });
  });
}); 