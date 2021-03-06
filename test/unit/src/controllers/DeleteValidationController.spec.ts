import {NextFunction, Request, Response} from 'express';
import * as Joi from 'joi';
import DeleteValidationController from '../../../../src/controllers/DeleteValidationController';
import DeleteValidation from '../../../../src/validation/DeleteValidation';
import {expect, requestMock, responseMock, sinon, validateMock} from '../../../setupTests';

describe('DeleteValidationController', () => {
  describe('validateRoute()', () => {
    it('should call validate.validateFields() and handleValidation()', (done) => {
      const req: Request = requestMock({
        params: {
          filename: '9e5eb809-bce7-463e-8c2f-b6bd8c4832d9',
          processKey: 'test-process-key'
        }
      });
      const res: Response = responseMock({});
      const next: NextFunction = () => true;
      const deleteValidationController: DeleteValidationController = new DeleteValidationController(Joi);

      deleteValidationController.validate = validateMock;
      const validateStub: sinon.SinonStub = sinon.stub(deleteValidationController.validate, 'validateFields').returns(null);
      deleteValidationController.handleValidation = sinon.spy();

      deleteValidationController.validateRoute(req, res, next);

      expect(deleteValidationController.validate.validateFields).to.have.been.calledOnce;
      expect(deleteValidationController.validate.validateFields).to.have.been.calledWith(new DeleteValidation(), Joi, req.params);
      expect(deleteValidationController.handleValidation).to.have.been.calledOnce;
      expect(deleteValidationController.handleValidation).to.have.been.calledWith(req, res, next, null);

      validateStub.restore();

      done();
    });
  });
});
