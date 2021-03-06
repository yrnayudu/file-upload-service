import * as fs from 'fs';
import * as superagent from 'superagent';
import app from '../../../../src/index';
import IConfig from '../../../../src/interfaces/IConfig';
import Validation from '../../../../src/validation/Validation';
import {chai, config, expect, nock, testFile} from '../../../setupTests';

describe('FilesRouter', () => {
  const processKey: string = 'test-process-key';
  const {endpoints, fileVersions, services}: IConfig = config;
  const validation: Validation = new Validation();
  let filename: string;

  beforeEach(() => {
    const pathRegex: RegExp = new RegExp(`/${validation.filenamePattern}`);

    Object.keys(config.fileVersions).forEach((fileVersion) => {
      nock(`https://dummy-bucket.s3.dummy-region.amazonaws.com/test-process-key/${fileVersion}`)
      .put(pathRegex)
      .reply(200)
      .get(pathRegex)
      .reply(200, {}, {'Content-type': 'application/pdf'});
    });

    nock('https://dummy-bucket.s3.dummy-region.amazonaws.com')
      .post('/?delete')
      .reply(200);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('post()', () => {
    const postUrl: string = `${endpoints.files}/${processKey}`;
    let virusScanMock: nock.Interceptor;

    beforeEach(() => {
      const {virusScan}: IConfig['services'] = services;
      virusScanMock = nock(`http://${virusScan.host}:${virusScan.port}`).post(virusScan.path);

      testFile.buffer = fs.readFileSync('test/data/test-file.pdf');
    });

    it('should return the correct status and response when the correct data is given', (done) => {
      virusScanMock.reply(200, 'true');

      chai
        .request(app)
        .post(postUrl)
        .attach(testFile.fieldname, testFile.buffer, testFile.originalname)
        .end((err: any, res: any) => {
          expect(res.status).to.equal(201);
          expect(res.body).to.have.property('url');
          expect(res.body).to.have.property('name');
          expect(res.body).to.have.property('size');
          expect(res.body).to.have.property('processedTime');

          filename = res.body.url.split('/')[2];

          expect(filename).to.match(validation.filenameRegex);
          expect(res.body.url).to.match(new RegExp(`/${fileVersions.clean}/`));
          expect(res.body.name).to.equal(testFile.originalname);
          expect(res.body.size).to.equal(testFile.size);
          expect(err).to.equal(null);
          done();
        });
    });

    it('should return the correct status and response when incorrect data is given', (done) => {
      virusScanMock.reply(200, 'true');

      chai
        .request(app)
        .post(postUrl)
        .end((err: Error, res: superagent.Response) => {
          expect(res.status).to.equal(400);
          expect(res.body).to.deep.equal({error: '"file" is required'});
          expect(err).to.equal(null);
          done();
        });
    });

    it('should return the correct status and response when the route is not found', (done) => {
      chai
        .request(app)
        .post('/uploads')
        .attach(testFile.fieldname, testFile.buffer, testFile.originalname)
        .end((err: Error, res: superagent.Response) => {
          expect(res.status).to.equal(404);
          expect(res.body).to.deep.equal({error: 'Route not found'});
          expect(err).to.equal(null);
          done();
        });
    });

    it('should return the correct status and response when the virus scanning service is not available', (done) => {
      virusScanMock.reply(500, 'Internal Server Error');

      chai
        .request(app)
        .post(postUrl)
        .attach(testFile.fieldname, testFile.buffer, testFile.originalname)
        .end((err: Error, res: superagent.Response) => {
          expect(res.status).to.equal(500);
          expect(res.body).to.deep.equal({error: 'Unable to call the virus scanning service'});
          expect(err).to.equal(null);
          done();
        });
    });
  });

  describe('get()', () => {
    it('should return the correct status and response', (done) => {
      chai
        .request(app)
        .get(`${endpoints.files}/${processKey}/${fileVersions.original}/${filename}`)
        .end((err: Error, res: superagent.Response) => {
          expect(res.status).to.equal(200);
          expect(res.get('Content-Type')).to.equal('application/pdf');
          expect(err).to.equal(null);
          done();
        });
    });

    it('should return the correct status and response when the route is not found', (done) => {
      chai
        .request(app)
        .get(`${endpoints.files}/does-not-exist.txt`)
        .end((err: Error, res: superagent.Response) => {
          expect(res.status).to.equal(404);
          expect(res.body).to.deep.equal({error: 'Route not found'});
          expect(err).to.equal(null);
          done();
        });
    });
  });

  describe('delete()', () => {
    it('should return the correct status and response', (done) => {
      chai
        .request(app)
        .delete(`${endpoints.files}/${processKey}/${filename}`)
        .end((err: Error, res: superagent.Response) => {
          expect(res.status).to.equal(200);
          expect(res.body).to.deep.equal({message: 'Files deleted successfully'});
          expect(err).to.equal(null);
          done();
        });
    });

    it('should return the correct status and response when the route is not found', (done) => {
      chai
        .request(app)
        .delete(`${endpoints.files}/${processKey}`)
        .end((err: Error, res: superagent.Response) => {
          expect(res.status).to.equal(404);
          expect(res.body).to.deep.equal({error: 'Route not found'});
          expect(err).to.equal(null);
          done();
        });
    });
  });
});
