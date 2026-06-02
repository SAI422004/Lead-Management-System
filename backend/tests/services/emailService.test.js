// tests/services/emailService.test.js

// Mock nodemailer BEFORE requiring the service
const mockSendMail = jest.fn();
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail,
  })),
}));

const emailService = require('../../services/emailService');

describe('emailService.sendAssignmentEmail', () => {
  beforeEach(() => jest.clearAllMocks());

  const agentEmail = 'agent@test.com';
  const lead = {
    id: 'lead-uuid-1',
    name: 'Priya Patel',
    email: 'priya@client.com',
    phone: '9876540000',
    source: 'website',
    notes: 'Interested in product demo',
  };

  test('calls sendMail with correct recipient and lead details', async () => {
    mockSendMail.mockResolvedValueOnce({ messageId: 'msg-id-123' });

    await emailService.sendAssignmentEmail(agentEmail, lead);

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const mailOptions = mockSendMail.mock.calls[0][0];
    expect(mailOptions.to).toBe(agentEmail);
    expect(mailOptions.subject).toMatch(/assigned|lead/i);
    expect(mailOptions.html || mailOptions.text).toContain('Priya Patel');
  });

  test('resolves without throwing even if sendMail fails (non-blocking)', async () => {
    mockSendMail.mockRejectedValueOnce(new Error('SMTP connection refused'));

    // Should not throw — email failure is logged, not propagated
    await expect(emailService.sendAssignmentEmail(agentEmail, lead)).resolves.not.toThrow();
  });

  test('does not throw when agent email is undefined', async () => {
    await expect(emailService.sendAssignmentEmail(undefined, lead)).resolves.not.toThrow();
    // sendMail should not be called with undefined recipient
    if (mockSendMail.mock.calls.length > 0) {
      const mailOptions = mockSendMail.mock.calls[0][0];
      expect(mailOptions.to).toBeDefined();
    }
  });

  test('includes lead source in the email body', async () => {
    mockSendMail.mockResolvedValueOnce({ messageId: 'msg-id-456' });

    await emailService.sendAssignmentEmail(agentEmail, lead);

    const mailOptions = mockSendMail.mock.calls[0][0];
    const body = mailOptions.html || mailOptions.text || '';
    expect(body.toLowerCase()).toContain('website');
  });
});
