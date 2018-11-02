const inject = require('../inject/inject');

const stateStore = require('./state-store');

describe('deployment dir', function () {

    it('should give an error if not a directory', function () {
        try {
            stateStore.DeploymentDir("apply", __dirname + "/testdata/deployment1/monitors-namespace.yml");
            expect().fail("Error expected");
        } catch (e) {
            expect(e.message).to.be(__dirname + "/testdata/deployment1/monitors-namespace.yml is not a directory")
        }
    });

    it('should calculate signature for directory contents', function () {
        expect(stateStore.DeploymentDir("apply", __dirname + "/testdata/deployment1").signature()).to.be("676f174330907be1b69b114992a0e3df");
    });

    it('two dirs with identical contents should yield same signature', function () {
        expect(stateStore.DeploymentDir("apply", __dirname + "/testdata/deployment1").signature()).to.be(stateStore.DeploymentDir("apply", __dirname + "/testdata/deployment2").signature());
    });
});


describe('deployment state store', function () {

    describe('get new state', function () {

        let state;

        beforeEach(function (done) {
            let storageBackend = stateStore.InMemoryStore();
            stateStore.ReleaseStateStore(inject({storageBackend})).storeDeploymentDirState({
                operation: "apply",
                identifier: "deployment/identifier",
                version: "deployment.version",
                directory: __dirname + "/testdata/deployment1",
                env: "testrun"
            }).then(
                function (st) {
                    state = st;
                    done();
                }, function () {
                    expect().fail("Error not expected");
                    done("Failed");
                }
            );
        });

        it('should return state', function () {
            expect(state).to.be.ok();
        });

        it('should be new', function () {
            expect(state.new).to.be(true);
        });

        it('should be modified', function () {
            expect(state.modified).to.be(true);
        });

        it('should return version supplied', function () {
            expect(state.version).to.be("deployment.version");
        });

        it('should return a signature', function () {
            expect(state.signature).to.be.ok();
        });
    });

    describe('two deployments with no modifications', function () {
        let releaseStateStore;
        let state;
        let storageBackend;

        beforeEach(function (done) {
            storageBackend = stateStore.InMemoryStore();
            releaseStateStore = stateStore.ReleaseStateStore(inject({storageBackend}));

            releaseStateStore.storeDeploymentDirState({
                operation: "apply",
                identifier: "deployment/identifier",
                version: "deployment.version",
                directory: __dirname + "/testdata/deployment1",
                env: "testrun"
            }).then(function () {
                state = releaseStateStore.storeDeploymentDirState({
                    operation: "apply",
                    identifier: "deployment/identifier",
                    version: "deployment.version",
                    directory: __dirname + "/testdata/deployment1",
                    env: "testrun"
                }).then(function (st) {
                    state = st;
                    done();
                })

            });
        });

        it('should not have existing state ', function () {
            expect(state.new).to.be(false);
        });

        it('should not have state modified ', function () {
            expect(state.modified).to.be(false);
        });

        it('last version should be original version', function () {
            expect(state.lastVersion).to.be("deployment.version");
        })
    });

    describe('updated version', function () {
        let releaseStateStore;
        let state;
        let storageBackend;

        beforeEach(function (done) {
            storageBackend = stateStore.InMemoryStore();

            releaseStateStore = stateStore.ReleaseStateStore(inject({storageBackend}));
            releaseStateStore.storeDeploymentDirState({
                operation: "apply",
                identifier: "deployment/identifier",
                version: "v0.1",
                directory: __dirname + "/testdata/deployment1",
                env: "testrun"
            }).then(function () {
                releaseStateStore.storeDeploymentDirState({
                    operation: "apply",
                    identifier: "deployment/identifier",
                    version: "v0.2",
                    directory: __dirname + "/testdata/deployment1",
                    env: "testrun"
                }).then(function (result) {
                    state = result;
                    done();
                })
            })
        });

        it('should not be new', function () {
            expect(state.new).to.be(false);
        });

        it('should be modified', function () {
            expect(state.modified).to.be(true);
        });

        it('should store new version', function () {
            return storageBackend.get("testrun-deployment/identifier").then(function (storedState) {
                expect(storedState.value.version).to.be("v0.2");
            })
        });

        it('should add timestamp', function () {
            let referenceTime = new Date().toISOString();
            return storageBackend.get("testrun-deployment/identifier").then(function (storedState) {
                expect(storedState.value.timestamp.split('T')[0]).to.be(referenceTime.split('T')[0]);
            })
        });

    });

    describe('modified deployment contents', function () {
        let releaseStateStore;
        let state;
        let storageBackend;

        beforeEach(function (done) {
            storageBackend = stateStore.InMemoryStore();
            releaseStateStore = stateStore.ReleaseStateStore(inject({storageBackend}));

            releaseStateStore.storeDeploymentDirState({
                operation: "apply",
                identifier: "deployment/identifier",
                version: "v0.1",
                directory: __dirname + "/testdata/deployment1",
                env: "testrun"
            }).then(function () {
                releaseStateStore.storeDeploymentDirState({
                    operation: "apply",
                    identifier: "deployment/identifier",
                    version: "v0.1",
                    directory: __dirname + "/testdata/deployment3",
                    env: "testrun"
                }).then(function (result) {
                    state = result;
                    done();
                })
            })
        });

        it('should not be new', function () {
            expect(state.new).to.be(false);
        });

        it('should be modified', function () {
            expect(state.modified).to.be(true);
        });

        it('should have unchanged version', function (done) {

            storageBackend.get("testrun-deployment/identifier").then(function (storedState) {
                expect(storedState.value.version).to.be("v0.1");
                done();
            })
        })
    });


    describe('different operation', function () {
        let releaseStateStore;
        let state;
        let storageBackend;

        beforeEach(function (done) {
            storageBackend = stateStore.InMemoryStore();
            releaseStateStore = stateStore.ReleaseStateStore(inject({storageBackend}));

            releaseStateStore.storeDeploymentDirState({
                operation: "apply",
                identifier: "deployment/identifier",
                version: "v0.1",
                directory: __dirname + "/testdata/deployment1",
                env: "testrun"
            }).then(function () {
                releaseStateStore.storeDeploymentDirState({
                    operation: "delete",
                    identifier: "deployment/identifier",
                    version: "v0.1",
                    directory: __dirname + "/testdata/deployment1",
                    env: "testrun"
                }).then(function (result) {
                    state = result;
                    done();
                })
            })
        });

        it('should not be new', function () {
            expect(state.new).to.be(false);
        });

        it('should be modified', function () {
            expect(state.modified).to.be(true);
        });

    });

    describe('different env', function () {
        let releaseStateStore;
        let state;
        let storageBackend;

        beforeEach(function (done) {
            storageBackend = stateStore.InMemoryStore();
            releaseStateStore = stateStore.ReleaseStateStore(inject({storageBackend}));

            releaseStateStore.storeDeploymentDirState({
                operation: "apply",
                identifier: "deployment/identifier",
                version: "v0.1",
                directory: __dirname + "/testdata/deployment1",
                env: "dev"
            }).then(function () {
                releaseStateStore.storeDeploymentDirState({
                    operation: "apply",
                    identifier: "deployment/identifier",
                    version: "v0.1",
                    directory: __dirname + "/testdata/deployment1",
                    env: "test"
                }).then(function (result) {
                    state = result;
                    done();
                })
            })
        });

        it('should be new', function () {
            expect(state.new).to.be(true);
        });

        it('should be modified', function () {
            expect(state.modified).to.be(true);
        });

        it('should store env with state', function () {
            expect(state.env).to.eql('test');
        })

    });

    describe('deployment descriptor storing', function () {
        let releaseStateStore;
        let secondState, firstState;
        let storageBackend;

        describe('unmodified', function () {
            beforeEach(function (done) {
                storageBackend = stateStore.InMemoryStore();
                releaseStateStore = stateStore.ReleaseStateStore(inject({storageBackend}));

                releaseStateStore.getDeploymentState({
                    operation: "apply",
                    identifier: "deployment/identifier",
                    version: "deployment.version",
                    descriptor: "k8s yaml or env + parameters go here",
                    env: "testrun"
                }).then(releaseStateStore.saveDeploymentState).then(function (st1){
                    console.debug("st1", st1);
                    firstState = st1;
                    releaseStateStore.getDeploymentState({
                        operation: "apply",
                        identifier: "deployment/identifier",
                        version: "deployment.version",
                        descriptor: "k8s yaml or env + parameters go here",
                        env: "testrun"
                    }).then(function (st2) {
                        secondState = st2;
                        done();
                    })

                });
            });

            it('second state should not report new', function () {
                expect(secondState.new).to.be(false);
            });

            it('second should not have state modified ', function () {
                expect(secondState.modified).to.be(false);
            });

            it('second state last version should be original version', function () {
                expect(secondState.lastVersion).to.be("deployment.version");
            })

        });

        describe('changed deployment descriptor', function () {
            beforeEach(function (done) {
                storageBackend = stateStore.InMemoryStore();
                releaseStateStore = stateStore.ReleaseStateStore(inject({storageBackend}));

                releaseStateStore.getDeploymentState({
                    operation: "apply",
                    identifier: "deployment/identifier",
                    version: "deployment.version",
                    descriptor: "k8s yaml or env + parameters go here",
                    env: "testrun"
                }).then(releaseStateStore.saveDeploymentState).then(function (st1) {
                    firstState = st1;
                    releaseStateStore.getDeploymentState({
                        operation: "apply",
                        identifier: "deployment/identifier",
                        version: "deployment.version",
                        descriptor: "changed k8s yaml or env + parameters go here",
                        env: "testrun"
                    }).then(function (st2) {
                        secondState = st2;
                        done();
                    })

                });
            });

            it('second state should not report new', function () {
                expect(secondState.new).to.be(false);
            });

            it('second should have state modified ', function () {
                expect(secondState.modified).to.be(true);
            });

            it('second state last version should be original version', function () {
                expect(secondState.lastVersion).to.be("deployment.version");
            });
        });


        describe('changed deployment version', function () {
            beforeEach(function (done) {
                storageBackend = stateStore.InMemoryStore();
                releaseStateStore = stateStore.ReleaseStateStore(inject({storageBackend}));

                releaseStateStore.getDeploymentState({
                    operation: "apply",
                    identifier: "deployment/identifier",
                    version: "deployment.version",
                    descriptor: "k8s yaml or env + parameters go here",
                    env: "testrun"
                }).then(releaseStateStore.saveDeploymentState).then(function (st1) {
                    firstState = st1;
                    releaseStateStore.getDeploymentState({
                        operation: "apply",
                        identifier: "deployment/identifier",
                        version: "deployment.new.version",
                        descriptor: "k8s yaml or env + parameters go here",
                        env: "testrun"
                    }).then(function (st2) {
                        secondState = st2;
                        done();
                    })

                });
            });

            it('second state should not report new', function () {
                expect(secondState.new).to.be(false);
            });

            it('second should have state modified ', function () {
                expect(secondState.modified).to.be(true);
            });

            it('second state last version should be original version', function () {
                expect(secondState.lastVersion).to.be("deployment.version");
            });
        });
    });


});