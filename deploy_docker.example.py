import os
import paramiko
import time

# Exemplo de configuração de deploy via SSH / Docker
VPS_IP = "SEU_IP_AQUI"
VPS_PORT = 22
VPS_USER = "root"
VPS_PASS = "SUA_SENHA_AQUI"
REMOTE_DIR = "/root/discord-gamezeda"
LOCAL_DIR = os.path.dirname(os.path.abspath(__file__))

def run_command(ssh, cmd):
    print(f"\n[EXEC] {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    if out:
        print(f"[OUT]\n{out.strip()}")
    if err:
        print(f"[ERR]\n{err.strip()}")
    return out, err

def upload_folder(sftp, local_dir, remote_dir):
    try:
        sftp.mkdir(remote_dir)
    except IOError:
        pass

    for item in os.listdir(local_dir):
        if item in ['node_modules', '.git', '__pycache__', 'deploy_docker.py']:
            continue
        local_path = os.path.join(local_dir, item)
        remote_path = f"{remote_dir}/{item}"

        if os.path.isdir(local_path):
            upload_folder(sftp, local_path, remote_path)
        else:
            print(f"[SFTP] {item} -> {remote_path}")
            sftp.put(local_path, remote_path)

def deploy():
    print(f"[*] Conectando via SSH em {VPS_USER}@{VPS_IP}:{VPS_PORT}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_IP, port=VPS_PORT, username=VPS_USER, password=VPS_PASS, timeout=15)
    print("[+] Conectado!")

    run_command(ssh, f"mkdir -p {REMOTE_DIR}")
    sftp = ssh.open_sftp()
    upload_folder(sftp, LOCAL_DIR, REMOTE_DIR)
    sftp.close()

    run_command(ssh, "ufw allow 3050/tcp || true")
    run_command(ssh, f"cd {REMOTE_DIR} && docker compose up -d --build")
    time.sleep(3)
    run_command(ssh, "docker ps --filter 'name=discord-gamezeda'")
    ssh.close()
    print("\n[OK] Deploy concluído!")

if __name__ == "__main__":
    deploy()
