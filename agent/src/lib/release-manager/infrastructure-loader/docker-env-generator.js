const fs = require('fs');
const _ = require('lodash');

module.exports=function(injected){

    let reservedNames=injected('reservedNames', true) || [];

    const RESERVED_NAMES=[
        "AWS_DEFAULT_PROFILE","DISPLAY","GOPATH","HOME","KUBECONFIG","PATH","PWD",
        "SHELL","SHLVL","SSH_CLIENT" ,"TERM","USER","XAUTHORITY"];

    reservedNames=reservedNames.concat(RESERVED_NAMES);

    let dockerEnvGenerator={
        generateEnvString(env) {
            let censored = _.omit(env, reservedNames);
            let buffer = [];
            _.each(censored, function (value, key) {
                buffer.push(key);
                buffer.push('=');
                buffer.push(value);
                buffer.push('\n');
            });
            return buffer.join('');
        },
        generateEnvFile(fileName, env){
            let data = this.generateEnvString(env);
            fs.writeFileSync(fileName, data)
        }
    };
    return dockerEnvGenerator;
};
