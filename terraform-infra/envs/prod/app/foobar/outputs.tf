output "cluster_name" {
  description = "ECS Cluster name"
  value       = aws_ecs_cluster.this.name
}

output "service_name" {
  description = "ECS Service name"
  value       = aws_ecs_service.this.name
}

output "bucket_name" {
  description = "S3 bucket name for env files"
  value       = aws_s3_bucket.env_file.bucket
}