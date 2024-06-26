# Huawei Cloud - Installation

### Installing Node.js

Serverless is a [Node.js](https://nodejs.org) CLI tool so the first thing you need to do is to install Node.js on your machine.

Go to the official [Node.js website](https://nodejs.org), download and follow the [installation instructions](https://nodejs.org/en/download/) to install Node.js on your local machine.

You can verify that Node.js is installed successfully by running `node --version` in your terminal. You should see the corresponding Node version number printed out.

### Installing the Serverless Framework

Next, install the Serverless Framework via [npm](https://npmjs.org) which was already installed when you installed Node.js.

Open up a terminal and type `npm install -g serverless` to install Serverless.

```bash
npm install -g serverless
```

Once the installation process is done you can verify that Serverless is installed successfully by running the following command in your terminal:

```bash
serverless
```

To see which version of serverless you have installed run:

```bash
serverless --version
```

### Installing the Huawei Cloud Function Compute Provider Plugin

To install, install the latest package from npm, run:

```
npm i --save serverless-huawei-functions
```

### Setting up Huawei Cloud Function Compute

To run Serverless commands that issue requests to Huawei Cloud, you will need to setup your Huawei Cloud credentials on your machine.

[Follow these instructions on setting up your Huawei Cloud credentials](./credentials.md)
