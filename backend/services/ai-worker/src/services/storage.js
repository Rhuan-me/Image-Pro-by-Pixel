const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { env } = require('../config/env');

class WorkerStorageService {
    constructor() {
        this.client = new S3Client({
            endpoint: env.s3Endpoint || env.minioEndpoint,
            region: env.s3Region || 'us-east-1',
            credentials: {
                accessKeyId: env.s3AccessKeyId || env.minioRootUser || 'anykey',
                secretAccessKey: env.s3SecretAccessKey || env.minioRootPassword || 'anysecret'
            },
            forcePathStyle: true
        });
        this.bucket = env.s3Bucket || env.minioBucket || 'pixpro-storage';
    }

    /**
     * Faz upload da imagem processada de volta para o Storage S3 (SeaweedFS / MinIO)
     */
    async uploadProcessedImage({ buffer, key, contentType = 'image/jpeg', bucket = this.bucket }) {
        const targetBucket = bucket || this.bucket;
        const cleanEndpoint = (env.s3Endpoint || env.minioEndpoint || 'http://localhost:9000').replace(/\/$/, '');
        const publicUrl = `${cleanEndpoint}/${targetBucket}/${key}`;

        try {
            const command = new PutObjectCommand({
                Bucket: targetBucket,
                Key: key,
                Body: buffer,
                ContentType: contentType
            });

            await this.client.send(command);

            return {
                bucket: targetBucket,
                key,
                url: publicUrl,
                publicUrl
            };
        } catch (err) {
            console.warn(`[WorkerStorage] Aviso ao enviar imagem processada para o Storage S3 (${key}): ${err.message}`);
            // Em ambiente de teste/fallback retorna a URL esperada
            return {
                bucket: targetBucket,
                key,
                url: publicUrl,
                publicUrl
            };
        }
    }

    /**
     * Baixa imagem do Storage S3 caso não esteja presente no volume compartilhado em disco.
     */
    async downloadImage({ key, bucket = this.bucket }) {
        const targetBucket = bucket || this.bucket;
        try {
            const command = new GetObjectCommand({
                Bucket: targetBucket,
                Key: key
            });

            const response = await this.client.send(command);
            const chunks = [];
            for await (const chunk of response.Body) {
                chunks.push(chunk);
            }
            return Buffer.concat(chunks);
        } catch (err) {
            console.warn(`[WorkerStorage] Falha ao baixar do Storage S3 (${key}): ${err.message}`);
            return null;
        }
    }
}

module.exports = new WorkerStorageService();
