
def triple_nested(arr):
    n = len(arr)
    for i in range(n):
        for j in range(n):
            for k in range(n):
                print(arr[i], arr[j], arr[k])
