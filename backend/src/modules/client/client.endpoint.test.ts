import express from 'express';
import request from 'supertest';

// Shared mock service that the controller will use
const mockClientService: any = {
  createClient: jest.fn(),
  updateClient: jest.fn(),
  deleteClient: jest.fn(),
  getClientById: jest.fn(),
  getAllClients: jest.fn(),
};

// Mock ClientService before importing routes so controllers bind to this mock
jest.mock('./client.service', () => ({
  ClientService: jest.fn().mockImplementation(() => mockClientService),
}));

/**
 * Build an Express app instance mounting /api/clients with a customizable auth middleware mock.
 * The auth middleware attaches req.userId (and req.user) when provided; otherwise, it leaves them undefined.
 */
function buildTestApp(authImpl: (req: any, res: any, next: any) => void) {
  jest.isolateModules(() => {
    jest.resetModules();
  });

  jest.isolateModules(() => {
    jest.doMock('../../middleware/auth.middleware', () => ({
      authenticateJWT: authImpl,
    }));

    // Import routes within isolated module context after auth mock is set
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { clientRoutes } = require('./client.routes');

    const app = express();
    app.use(express.json());
    app.use('/api/clients', clientRoutes);

    // Attach to global for retrieval outside isolateModules closure
    (global as any).__clients_app__ = app;
  });

  return (global as any).__clients_app__ as express.Express;
}

describe('Client Endpoints - Router smoke tests', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();

    // Default auth mock: attaches a valid userId
    const authWithUser = (req: any, _res: any, next: any) => {
      req.userId = 100;
      req.user = { id: 100, email: 'test@example.com', username: 'tester', role: 'accountant' };
      next();
    };
    app = buildTestApp(authWithUser);
  });

  describe('POST /api/clients - Create Client', () => {
    const validClientData = {
      clientCode: 'CLI-001',
      name: 'Acme Corp',
      currencyId: 1,
      email: 'info@example.com',
    };

    it('returns 201 with Location header and success payload for valid data', async () => {
      const created = {
        id: 123,
        clientCode: 'CLI-001',
        taxId: undefined,
        name: 'Acme Corp',
        contactName: undefined,
        email: 'info@example.com',
        phone: undefined,
        address: undefined,
        city: undefined,
        state: undefined,
        country: 'NI',
        postalCode: undefined,
        creditLimit: '0',
        currencyId: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: 100,
        updatedById: undefined,
      };

      mockClientService.createClient.mockResolvedValue(created);

      const res = await request(app)
        .post('/api/clients')
        .set('User-Agent', 'client-endpoint-test-agent')
        .send(validClientData)
        .expect(201);

      expect(res.headers.location).toBe(`/api/clients/${created.id}`);
      expect(res.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: created.id,
          clientCode: created.clientCode,
          name: created.name,
          currencyId: 1,
          creditLimit: '0',
          isActive: true,
        }),
      });

      expect(mockClientService.createClient).toHaveBeenCalledTimes(1);
      expect(mockClientService.createClient).toHaveBeenCalledWith(
        expect.objectContaining({
          clientCode: 'CLI-001',
          name: 'Acme Corp',
          currencyId: 1,
        }),
        expect.objectContaining({
          ipAddress: expect.any(String),
          userAgent: 'client-endpoint-test-agent',
          userId: 100,
        })
      );
    });

    it('returns 400 for validation errors (missing currencyId)', async () => {
      const invalidData = { ...validClientData };
      delete (invalidData as any).currencyId;

      const res = await request(app)
        .post('/api/clients')
        .send(invalidData)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
      expect(mockClientService.createClient).not.toHaveBeenCalled();
    });

    it('returns 409 for duplicate client code', async () => {
      mockClientService.createClient.mockRejectedValue(new Error('DUPLICATE_CLIENT_CODE'));

      const res = await request(app)
        .post('/api/clients')
        .send(validClientData)
        .expect(409);

      expect(res.body).toEqual({
        success: false,
        error: { message: 'Conflict', code: 'DUPLICATE_CLIENT_CODE' },
      });
    });
  });

  describe('GET /api/clients - List Clients', () => {
    it('returns 200 with filtered owned clients and pagination meta', async () => {
      const list = [
        {
          id: 1,
          clientCode: 'OWN-1',
          taxId: undefined,
          name: 'Owned One',
          contactName: undefined,
          email: undefined,
          phone: undefined,
          address: undefined,
          city: undefined,
          state: undefined,
          country: 'NI',
          postalCode: undefined,
          creditLimit: '0',
          currencyId: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdById: 100,
          updatedById: undefined,
        },
        {
          id: 2,
          clientCode: 'OTH-2',
          taxId: undefined,
          name: 'Other Two',
          contactName: undefined,
          email: undefined,
          phone: undefined,
          address: undefined,
          city: undefined,
          state: undefined,
          country: 'NI',
          postalCode: undefined,
          creditLimit: '0',
          currencyId: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdById: 200,
          updatedById: undefined,
        },
      ];
      mockClientService.getAllClients.mockResolvedValue(list);

      const res = await request(app)
        .get('/api/clients?page=1&pageSize=1')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].createdById).toBe(100);
      expect(res.body.meta).toEqual(
        expect.objectContaining({
          page: 1,
          pageSize: 1,
          total: 1,
          totalPages: 1,
        })
      );
    });

    it('returns 401 when userId is missing', async () => {
      const authWithoutUser = (_req: any, _res: any, next: any) => {
        // Do not attach userId; controller should return 401
        next();
      };
      const appNoUser = buildTestApp(authWithoutUser);

      const res = await request(appNoUser).get('/api/clients').expect(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toEqual(expect.objectContaining({ message: 'Unauthorized' }));
    });
  });

  describe('GET /api/clients/:id - Get Client by ID', () => {
    it('returns 200 for owned client', async () => {
      mockClientService.getClientById.mockResolvedValue({
        id: 77,
        clientCode: 'OWN-77',
        taxId: undefined,
        name: 'Owned 77',
        contactName: undefined,
        email: undefined,
        phone: undefined,
        address: undefined,
        city: undefined,
        state: undefined,
        country: 'NI',
        postalCode: undefined,
        creditLimit: '0',
        currencyId: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: 100,
        updatedById: undefined,
      });

      const res = await request(app).get('/api/clients/77').expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(77);
    });

    it('returns 404 for non-owned client', async () => {
      mockClientService.getClientById.mockResolvedValue({
        id: 88,
        clientCode: 'OTH-88',
        taxId: undefined,
        name: 'Other 88',
        contactName: undefined,
        email: undefined,
        phone: undefined,
        address: undefined,
        city: undefined,
        state: undefined,
        country: 'NI',
        postalCode: undefined,
        creditLimit: '0',
        currencyId: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: 200,
        updatedById: undefined,
      });

      const res = await request(app).get('/api/clients/88').expect(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toEqual(expect.objectContaining({ message: 'Cliente no encontrado' }));
    });

    it('returns 400 for invalid id', async () => {
      const res = await request(app).get('/api/clients/abc').expect(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/clients/:id - Update Client', () => {
    it('returns 200 for owned client update', async () => {
      mockClientService.getClientById.mockResolvedValue({
        id: 21,
        clientCode: 'OWN-21',
        taxId: undefined,
        name: 'Owned 21',
        contactName: undefined,
        email: undefined,
        phone: undefined,
        address: undefined,
        city: undefined,
        state: undefined,
        country: 'NI',
        postalCode: undefined,
        creditLimit: '0',
        currencyId: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: 100,
        updatedById: undefined,
      });

      mockClientService.updateClient.mockResolvedValue({
        id: 21,
        clientCode: 'OWN-21',
        taxId: undefined,
        name: 'Owned 21 Updated',
        contactName: undefined,
        email: undefined,
        phone: undefined,
        address: undefined,
        city: undefined,
        state: undefined,
        country: 'NI',
        postalCode: undefined,
        creditLimit: '100',
        currencyId: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: 100,
        updatedById: 100,
      });

      const res = await request(app)
        .put('/api/clients/21')
        .send({ name: 'Owned 21 Updated', creditLimit: '100' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Owned 21 Updated');
      expect(res.body.data.creditLimit).toBe('100');
    });

    it('returns 404 when client not found or not owned', async () => {
      mockClientService.getClientById.mockResolvedValue(null);

      const res = await request(app).put('/api/clients/99').send({ name: 'X' }).expect(404);
      expect(res.body.success).toBe(false);
    });

    it('returns 403 for invalid operation (clientCode change)', async () => {
      mockClientService.getClientById.mockResolvedValue({
        id: 50,
        clientCode: 'OWN-50',
        taxId: undefined,
        name: 'Owned 50',
        contactName: undefined,
        email: undefined,
        phone: undefined,
        address: undefined,
        city: undefined,
        state: undefined,
        country: 'NI',
        postalCode: undefined,
        creditLimit: '0',
        currencyId: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: 100,
        updatedById: undefined,
      });
      mockClientService.updateClient.mockRejectedValue(new Error('INVALID_OPERATION'));

      const res = await request(app).put('/api/clients/50').send({ clientCode: 'NEW-50' }).expect(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_OPERATION');
    });

    it('returns 409 for duplicate tax id', async () => {
      mockClientService.getClientById.mockResolvedValue({
        id: 60,
        clientCode: 'OWN-60',
        taxId: undefined,
        name: 'Owned 60',
        contactName: undefined,
        email: undefined,
        phone: undefined,
        address: undefined,
        city: undefined,
        state: undefined,
        country: 'NI',
        postalCode: undefined,
        creditLimit: '0',
        currencyId: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: 100,
        updatedById: undefined,
      });
      mockClientService.updateClient.mockRejectedValue(new Error('DUPLICATE_TAX_ID'));

      const res = await request(app).put('/api/clients/60').send({ taxId: 'NEW-TAX' }).expect(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DUPLICATE_TAX_ID');
    });

    it('returns 400 for invalid currencyId', async () => {
      mockClientService.getClientById.mockResolvedValue({
        id: 70,
        clientCode: 'OWN-70',
        taxId: undefined,
        name: 'Owned 70',
        contactName: undefined,
        email: undefined,
        phone: undefined,
        address: undefined,
        city: undefined,
        state: undefined,
        country: 'NI',
        postalCode: undefined,
        creditLimit: '0',
        currencyId: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: 100,
        updatedById: undefined,
      });

      const res = await request(app).put('/api/clients/70').send({ currencyId: -1 }).expect(400);
      expect(res.body.success).toBe(false);
      expect(mockClientService.updateClient).not.toHaveBeenCalled();
    });

    it('returns 400 for invalid creditLimit', async () => {
      mockClientService.getClientById.mockResolvedValue({
        id: 71,
        clientCode: 'OWN-71',
        taxId: undefined,
        name: 'Owned 71',
        contactName: undefined,
        email: undefined,
        phone: undefined,
        address: undefined,
        city: undefined,
        state: undefined,
        country: 'NI',
        postalCode: undefined,
        creditLimit: '0',
        currencyId: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: 100,
        updatedById: undefined,
      });

      const res = await request(app).put('/api/clients/71').send({ creditLimit: -5 }).expect(400);
      expect(res.body.success).toBe(false);
      expect(mockClientService.updateClient).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/clients/:id - Delete Client', () => {
    it('returns 204 for owned client deletion', async () => {
      mockClientService.getClientById.mockResolvedValue({
        id: 31,
        clientCode: 'OWN-31',
        taxId: undefined,
        name: 'Owned 31',
        contactName: undefined,
        email: undefined,
        phone: undefined,
        address: undefined,
        city: undefined,
        state: undefined,
        country: 'NI',
        postalCode: undefined,
        creditLimit: '0',
        currencyId: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: 100,
        updatedById: undefined,
      });
      mockClientService.deleteClient.mockResolvedValue(true);

      const res = await request(app).delete('/api/clients/31').expect(204);
      expect(res.text).toBe('');
    });

    it('returns 404 when client not found', async () => {
      mockClientService.getClientById.mockResolvedValue(null);

      const res = await request(app).delete('/api/clients/41').expect(404);
      expect(res.body.success).toBe(false);
    });

    it('returns 401 when userId is missing', async () => {
      const authWithoutUser = (_req: any, _res: any, next: any) => {
        // Do not attach userId; controller should return 401
        next();
      };
      const appNoUser = buildTestApp(authWithoutUser);

      const res = await request(appNoUser).delete('/api/clients/31').expect(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toEqual(expect.objectContaining({ message: 'Unauthorized' }));
    });
  });
});