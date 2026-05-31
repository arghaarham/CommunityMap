const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");
const { env } = require("../config/env");

const s3 = env.awsS3Bucket
  ? new S3Client({
      region: env.awsRegion,
      credentials: env.awsAccessKeyId
        ? {
            accessKeyId: env.awsAccessKeyId,
            secretAccessKey: env.awsSecretAccessKey,
          }
        : undefined,
    })
  : null;

function getS3Url(key) {
  return `https://${env.awsS3Bucket}.s3.${env.awsRegion}.amazonaws.com/${key}`;
}

async function uploadFile(key, buffer, contentType) {
  if (s3) {
    await s3.send(
      new PutObjectCommand({
        Bucket: env.awsS3Bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    return { url: getS3Url(key), storageKey: key };
  }

  const localPath = path.join(env.uploadDir, key);
  fs.mkdirSync(path.dirname(localPath), { recursive: true });
  fs.writeFileSync(localPath, buffer);
  return { url: null, storageKey: key };
}

function isS3Enabled() {
  return s3 !== null;
}

module.exports = { uploadFile, isS3Enabled, getS3Url };
