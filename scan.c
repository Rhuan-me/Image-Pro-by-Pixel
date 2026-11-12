#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <dirent.h>
#include <unistd.h>

void list_serial_ports() {
    DIR *dir;
    struct dirent *ent;
    char path[1024];

    snprintf(path, sizeof(path), "/dev/ttyUSB*");
    dir = opendir(path);
    if (dir) {
        while ((ent = readdir(dir)) != NULL) {
            if (ent->d_type == DT_LNK) {
                printf("Serial port: /dev/ttyUSB%s\n", ent->d_name);
            }
        }
        closedir(dir);
    }
}

void list_usb_devices() {
    DIR *dir;
    struct dirent *ent;
    char path[1024];

    snprintf(path, sizeof(path), "/dev/sd*");
    dir = opendir(path);
    if (dir) {
        while ((ent = readdir(dir)) != NULL) {
            if (ent->d_type == DT_LNK) {
                printf("USB device: /dev/sd%s\n", ent->d_name);
            }
        }
        closedir(dir);
    }
}

int main() {
    printf("Scanning for serial ports...\n");
    list_serial_ports();

    printf("\nScanning for USB devices...\n");
    list_usb_devices();

    return 0;
}