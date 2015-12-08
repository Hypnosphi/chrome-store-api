/**
 * @author acvetkov@yandex-team.ru
 * @overview
 */

import nock from 'nock';

import TokenManager from '../../src/token/index';
import FakeStorage from '../lib/fake-storage';

const CODE = 'code';
const CLIENT_ID = 'client_id';
const CLIENT_SECRET = 'client_secret';

const DATA = {
    code: {
        access_token: '1',
        refresh_token: '2'
    }
};

const GET_BODY = {
    client_id: 'client_id',
    client_secret: 'client_secret',
    code: 'code',
    grant_type: 'authorization_code',
    redirect_uri: 'urn:ietf:wg:oauth:2.0:oob'
};

const REFRESH_BODY = {
    client_id: 'client_id',
    client_secret: 'client_secret',
    grant_type: 'refresh_token',
    refresh_token: 'refreshToken'
};

describe('TokenManager', function () {

    beforeEach(function () {
        nock.cleanAll();
    });

    describe('get', function () {

        describe('without storage', function () {

            beforeEach(function () {
                this.manager = new TokenManager(CODE, CLIENT_ID, CLIENT_SECRET);
            });

            it('should get token from server', function () {
                var tokenFromServer = nock('https://accounts.google.com')
                    .post('/o/oauth2/token', GET_BODY)
                    .reply(200, {
                        access_token: '1',
                        refresh_token: '2'
                    });
                return this.manager.get()
                    .then(token => {
                        assert.ok(tokenFromServer.isDone(), 'token from server');
                        assert.equal(token, '1');
                    });
            });

            it('should get token from cache', function () {
                nock('https://accounts.google.com')
                    .post('/o/oauth2/token', GET_BODY)
                    .reply(200, {
                        access_token: '1',
                        refresh_token: '2'
                    })
                    .post('/o/oauth2/token', GET_BODY)
                    .reply(200, {
                        access_token: '3',
                        refresh_token: '4'
                    });
                return this.manager.get()
                    .then(token => {
                        assert.equal(token, '1');
                    })
                    .then(() => {
                        return this.manager.get()
                            .then(secondToken => {
                                assert.equal(secondToken, '1');
                            });
                    });
            });
        });

        describe('with storage', function () {

            beforeEach(function () {
                FakeStorage.data = {};
                this.manager = new TokenManager(CODE, CLIENT_ID, CLIENT_SECRET, FakeStorage);
            });

            it('should get token from server', function () {
                FakeStorage.data = {};
                nock('https://accounts.google.com')
                    .post('/o/oauth2/token', GET_BODY)
                    .reply(200, {
                        access_token: '3',
                        refresh_token: '4'
                    });
                return this.manager.get()
                    .then(token => {
                        assert.equal(token, '3');
                    });
            });

            it('should get token from storage', function () {
                FakeStorage.data = DATA;
                nock('https://accounts.google.com')
                    .post('/o/oauth2/token', GET_BODY)
                    .reply(200, {
                        access_token: '3',
                        refresh_token: '4'
                    });
                return this.manager.get()
                    .then(token => {
                        assert.equal(token, '1');
                    })
                    .then(() => {
                        return this.manager.get()
                            .then(secondToken => {
                                assert.equal(secondToken, '1');
                            });
                    });
            });
        });
    });

    describe('refresh', function () {

        describe('without storage', function () {

            beforeEach(function () {
                this.manager = new TokenManager(CODE, CLIENT_ID, CLIENT_SECRET);
            });

            it('should refresh token', function () {
                nock('https://accounts.google.com')
                    .post('/o/oauth2/token', GET_BODY)
                    .reply(200, {
                        access_token: '1',
                        refresh_token: 'refreshToken'
                    });

                nock('https://accounts.google.com')
                    .post('/o/oauth2/token', REFRESH_BODY)
                    .reply(200, {
                        access_token: '5',
                        refresh_token: '6'
                    });

                return this.manager.get()
                    .then(token => {
                        assert.equal(token, '1');
                    })
                    .then(() => {
                        return this.manager.refresh();
                    })
                    .then(token => {
                        assert.equal(token, '5', 'should return refreshed token');
                    })
                    .then(() => {
                        return this.manager.get();
                    })
                    .then(token => {
                        assert.equal(token, '5', 'should return cached token');
                    });
            });
        });

        describe('with storage', function () {

            beforeEach(function () {
                FakeStorage.data = {};
                this.manager = new TokenManager(CODE, CLIENT_ID, CLIENT_SECRET, FakeStorage);
            });

            it('should refresh token', function () {
                nock('https://accounts.google.com')
                    .post('/o/oauth2/token', GET_BODY)
                    .reply(200, {
                        access_token: '1',
                        refresh_token: 'refreshToken'
                    });

                nock('https://accounts.google.com')
                    .post('/o/oauth2/token', REFRESH_BODY)
                    .reply(200, {
                        access_token: '5',
                        refresh_token: '6'
                    });

                return this.manager.get()
                    .then(token => {
                        assert.equal(token, '1');
                    })
                    .then(() => {
                        return this.manager.refresh();
                    })
                    .then(token => {
                        assert.equal(token, '5', 'should return refreshed token');
                    })
                    .then(() => {
                        return this.manager.get();
                    })
                    .then(token => {
                        assert.equal(token, '5', 'should return cached token');
                    })
                    .then(() => {
                        return assert.eventually.deepEqual(FakeStorage.get(CODE), {
                            access_token: '5',
                            refresh_token: 'refreshToken'
                        }, 'should save to storage refreshed data');
                    });
            });

        });
    });
});
