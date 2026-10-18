#!/usr/bin/env bash
cd "$(dirname "$0")"
export ANSIBLE_CONFIG="$(pwd)/ansible.cfg"
ansible-playbook -i inventory.ini deploy-bluegreen.yml
