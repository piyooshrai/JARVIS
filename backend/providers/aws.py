from typing import List, Dict, Any
from config import get_settings
import logging
import boto3
from botocore.exceptions import ClientError, NoCredentialsError

logger = logging.getLogger(__name__)

# Common AWS regions to check
AWS_REGIONS = [
    "us-east-1", "us-east-2", "us-west-1", "us-west-2",
    "eu-west-1", "eu-west-2", "eu-central-1",
    "ap-south-1", "ap-southeast-1", "ap-southeast-2", "ap-northeast-1"
]

# EC2 instance pricing (approximate monthly cost in USD)
INSTANCE_PRICING = {
    "t2.micro": 8.50, "t2.small": 17.00, "t2.medium": 34.00, "t2.large": 68.00,
    "t3.micro": 7.50, "t3.small": 15.00, "t3.medium": 30.00, "t3.large": 60.00,
    "m5.large": 70.00, "m5.xlarge": 140.00, "m5.2xlarge": 280.00,
    "c5.large": 62.00, "c5.xlarge": 124.00,
    "r5.large": 91.00, "r5.xlarge": 182.00
}


class AWSProvider:
    def __init__(self):
        self.settings = get_settings()
        self.access_key = self.settings.aws_access_key_id
        self.secret_key = self.settings.aws_secret_access_key

    async def get_instances(self) -> List[Dict[str, Any]]:
        """Get all EC2 instances across multiple regions"""
        if not self.access_key or not self.secret_key:
            logger.warning("AWS credentials not configured")
            return []

        all_instances = []

        for region in AWS_REGIONS:
            try:
                ec2 = boto3.client(
                    'ec2',
                    aws_access_key_id=self.access_key,
                    aws_secret_access_key=self.secret_key,
                    region_name=region
                )

                response = ec2.describe_instances()

                for reservation in response.get('Reservations', []):
                    for instance in reservation.get('Instances', []):
                        # Skip terminated instances
                        state = instance.get('State', {}).get('Name', '')
                        if state == 'terminated':
                            continue

                        # Get instance name from tags
                        name = instance.get('InstanceId', 'Unknown')
                        for tag in instance.get('Tags', []):
                            if tag['Key'] == 'Name':
                                name = tag['Value']
                                break

                        instance_type = instance.get('InstanceType', 'unknown')
                        cost_monthly = INSTANCE_PRICING.get(instance_type, 0)

                        all_instances.append({
                            "id": instance['InstanceId'],
                            "name": name,
                            "provider": "AWS",
                            "type": "Server",
                            "size": instance_type,
                            "cost_monthly": float(cost_monthly),
                            "status": state,
                            "region": region
                        })

            except NoCredentialsError:
                logger.error("AWS credentials are invalid")
                break
            except ClientError as e:
                # Skip regions where we don't have access or no instances
                if e.response['Error']['Code'] not in ['UnauthorizedOperation', 'AccessDenied']:
                    logger.debug(f"Error fetching AWS instances in {region}: {str(e)}")
                continue
            except Exception as e:
                logger.error(f"Error fetching AWS instances in {region}: {str(e)}")
                continue

        logger.info(f"Fetched {len(all_instances)} AWS EC2 instances across all regions")
        return all_instances

    async def create_instance(self, **kwargs) -> Dict[str, Any]:
        """Create a new EC2 instance"""
        # TODO: Implement actual AWS SDK call
        logger.info("AWS create not yet implemented")
        return {}

    async def terminate_instance(self, instance_id: str) -> bool:
        """Terminate an EC2 instance"""
        # TODO: Implement actual AWS SDK call
        logger.info("AWS terminate not yet implemented")
        return True
