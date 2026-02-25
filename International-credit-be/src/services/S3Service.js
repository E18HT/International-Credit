const AWS = require('aws-sdk');
const config = require('../config');
const logger = require('../utils/logger');

class S3Service {
  constructor() {
    // Configure AWS
    AWS.config.update({
      region: config.aws.region,
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
    });

    this.s3 = new AWS.S3();
  }

  /**
   * Upload file to S3 bucket
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} fileName - File name
   * @param {string} bucketType - Bucket type (kyc, receipts, exports)
   * @param {string} contentType - File content type
   * @returns {Promise<Object>} Upload result
   */
  async uploadFile(fileBuffer, fileName, bucketType = 'kyc', contentType = 'application/octet-stream') {
    try {
      const bucketName = config.aws.s3.buckets[bucketType];
      if (!bucketName) {
        throw new Error(`Invalid bucket type: ${bucketType}`);
      }

      const uploadParams = {
        Bucket: bucketName,
        Key: fileName,
        Body: fileBuffer,
        ContentType: contentType,
        ServerSideEncryption: 'AES256',
      };

      const result = await this.s3.upload(uploadParams).promise();

      logger.info('File uploaded to S3 successfully', {
        bucket: bucketName,
        key: fileName,
        location: result.Location,
        etag: result.ETag,
      });

      return {
        success: true,
        url: result.Location,
        bucket: bucketName,
        key: fileName,
        etag: result.ETag,
      };
    } catch (error) {
      logger.error('Failed to upload file to S3:', {
        bucket: config.aws.s3.buckets[bucketType],
        fileName,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate signed URL for file access
   * @param {string} fileName - File name/key
   * @param {string} bucketType - Bucket type (kyc, receipts, exports)
   * @param {number} expiresIn - URL expiration time in seconds (default: 3600)
   * @returns {Promise<string>} Signed URL
   */
  async getSignedUrl(fileName, bucketType = 'kyc', expiresIn = 3600) {
    try {
      const bucketName = config.aws.s3.buckets[bucketType];
      if (!bucketName) {
        throw new Error(`Invalid bucket type: ${bucketType}`);
      }

      const params = {
        Bucket: bucketName,
        Key: fileName,
        Expires: expiresIn,
      };

      const url = await this.s3.getSignedUrlPromise('getObject', params);

      logger.info('Signed URL generated', {
        bucket: bucketName,
        key: fileName,
        expiresIn,
      });

      return url;
    } catch (error) {
      logger.error('Failed to generate signed URL:', {
        bucket: config.aws.s3.buckets[bucketType],
        fileName,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Delete file from S3
   * @param {string} fileName - File name/key
   * @param {string} bucketType - Bucket type (kyc, receipts, exports)
   * @returns {Promise<Object>} Deletion result
   */
  async deleteFile(fileName, bucketType = 'kyc') {
    try {
      const bucketName = config.aws.s3.buckets[bucketType];
      if (!bucketName) {
        throw new Error(`Invalid bucket type: ${bucketType}`);
      }

      const deleteParams = {
        Bucket: bucketName,
        Key: fileName,
      };

      await this.s3.deleteObject(deleteParams).promise();

      logger.info('File deleted from S3 successfully', {
        bucket: bucketName,
        key: fileName,
      });

      return {
        success: true,
        bucket: bucketName,
        key: fileName,
      };
    } catch (error) {
      logger.error('Failed to delete file from S3:', {
        bucket: config.aws.s3.buckets[bucketType],
        fileName,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Check if file exists in S3
   * @param {string} fileName - File name/key
   * @param {string} bucketType - Bucket type (kyc, receipts, exports)
   * @returns {Promise<boolean>} Whether file exists
   */
  async fileExists(fileName, bucketType = 'kyc') {
    try {
      const bucketName = config.aws.s3.buckets[bucketType];
      if (!bucketName) {
        throw new Error(`Invalid bucket type: ${bucketType}`);
      }

      const params = {
        Bucket: bucketName,
        Key: fileName,
      };

      await this.s3.headObject(params).promise();
      return true;
    } catch (error) {
      if (error.code === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * List files in bucket with optional prefix
   * @param {string} bucketType - Bucket type (kyc, receipts, exports)
   * @param {string} prefix - Optional prefix to filter files
   * @param {number} maxKeys - Maximum number of keys to return
   * @returns {Promise<Array>} List of files
   */
  async listFiles(bucketType = 'kyc', prefix = '', maxKeys = 1000) {
    try {
      const bucketName = config.aws.s3.buckets[bucketType];
      if (!bucketName) {
        throw new Error(`Invalid bucket type: ${bucketType}`);
      }

      const params = {
        Bucket: bucketName,
        Prefix: prefix,
        MaxKeys: maxKeys,
      };

      const result = await this.s3.listObjectsV2(params).promise();

      return result.Contents.map(item => ({
        key: item.Key,
        lastModified: item.LastModified,
        size: item.Size,
        etag: item.ETag,
      }));
    } catch (error) {
      logger.error('Failed to list files from S3:', {
        bucket: config.aws.s3.buckets[bucketType],
        prefix,
        error: error.message,
      });
      throw error;
    }
  }
}

module.exports = new S3Service();